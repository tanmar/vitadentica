// Zdjęcia zespołu: wycina postać (Apple Vision, lokalnie, bez internetu) i osadza ją na jednolitym tle
// w barwach strony, żeby karty lekarzy i personelu wyglądały spójnie.
//
// Użycie (macOS 14+):
//   swiftc -O scripts/team-backdrop.swift -o /tmp/team-backdrop
//   /tmp/team-backdrop <wejście> <wyjście.jpg> [--despill]
//
// --despill  usuwa zielony rant na krawędziach (zdjęcie robione na zielonym tle).
// Kolory tła wynikają z tokenów w src/styles/tokens.css (--color-accent, --color-brand-bright).

import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

/// Dłuższy bok wyniku. Strona pokazuje zdjęcia najwyżej w 576 px, więc 1600 px wystarcza z zapasem na Retinę.
let maxSide: CGFloat = 1600
let jpegQuality: CGFloat = 0.9

struct Rgb {
    let r: CGFloat, g: CGFloat, b: CGFloat
    func ci(alpha: CGFloat = 1) -> CIColor { CIColor(red: r, green: g, blue: b, alpha: alpha) }
}

/// Tło: chłodna, jasna szarość z delikatną aurorą jak na stronie (błękit u góry, burgund u dołu).
let backdropTop = Rgb(r: 0.965, g: 0.961, b: 0.973)
let backdropBottom = Rgb(r: 0.878, g: 0.870, b: 0.918)
let accentCyan = Rgb(r: 0.0, g: 0.604, b: 0.808)
let brandBright = Rgb(r: 0.753, g: 0.0, b: 0.165)

func fail(_ message: String) -> Never {
    FileHandle.standardError.write(Data("team-backdrop: \(message)\n".utf8))
    exit(1)
}

func loadInput(_ path: String) -> CIImage {
    guard var image = CIImage(contentsOf: URL(fileURLWithPath: path), options: [.applyOrientationProperty: true]) else {
        fail("nie można wczytać \(path)")
    }
    let scale = min(1, maxSide / max(image.extent.width, image.extent.height))
    if scale < 1 {
        image = image.applyingFilter("CILanczosScaleTransform", parameters: [kCIInputScaleKey: scale, kCIInputAspectRatioKey: 1])
    }
    return image.cropped(to: image.extent)
}

/// Podstawowa metoda: maska obiektu na pierwszym planie (ostre krawędzie, dobra przy włosach).
func instanceMask(handler: VNImageRequestHandler) -> CIImage? {
    let request = VNGenerateForegroundInstanceMaskRequest()
    guard (try? handler.perform([request])) != nil, let observation = request.results?.first,
          !observation.allInstances.isEmpty,
          let buffer = try? observation.generateScaledMaskForImage(forInstances: observation.allInstances, from: handler)
    else { return nil }
    return CIImage(cvPixelBuffer: buffer)
}

/// Awaryjnie: segmentacja osoby, gdy Vision nie uznał postaci za „obiekt” (zdarza się przy ciemnym stroju na jasnym tle).
func personMask(handler: VNImageRequestHandler, extent: CGRect) -> CIImage? {
    let request = VNGeneratePersonSegmentationRequest()
    request.qualityLevel = .accurate
    guard (try? handler.perform([request])) != nil, let buffer = request.results?.first?.pixelBuffer else { return nil }
    let mask = CIImage(cvPixelBuffer: buffer)
    let scale = CGAffineTransform(scaleX: extent.width / mask.extent.width, y: extent.height / mask.extent.height)
    return mask.transformed(by: scale)
}

func foregroundMask(for image: CIImage) -> CIImage {
    let handler = VNImageRequestHandler(ciImage: image, options: [:])
    guard let mask = instanceMask(handler: handler) ?? personMask(handler: handler, extent: image.extent) else {
        fail("Vision nie znalazł postaci")
    }
    return mask
}

/// Zawęża maskę o ok. 1 px i zmiękcza krawędź, żeby nie zostawał jasny rant ze starego tła.
func refine(mask: CIImage, extent: CGRect) -> CIImage {
    let unit = max(extent.width, extent.height) / 1000
    let eroded = mask.applyingFilter("CIMorphologyMinimum", parameters: [kCIInputRadiusKey: max(1, 0.9 * unit)])
    let feathered = eroded.applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: max(0.8, 0.8 * unit)])
    return feathered.cropped(to: extent)
}

/// Przycina zieleń do poziomu większego z kanałów R i B (3D LUT, bez własnych kerneli).
func despill(_ image: CIImage) -> CIImage {
    let size = 33
    var cube = [Float](repeating: 0, count: size * size * size * 4)
    var offset = 0
    for blue in 0..<size {
        for green in 0..<size {
            for red in 0..<size {
                let r = Float(red) / Float(size - 1)
                let g = Float(green) / Float(size - 1)
                let b = Float(blue) / Float(size - 1)
                cube[offset] = r
                cube[offset + 1] = min(g, max(r, b))
                cube[offset + 2] = b
                cube[offset + 3] = 1
                offset += 4
            }
        }
    }
    let data = cube.withUnsafeBufferPointer { Data(buffer: $0) }
    return image.applyingFilter("CIColorCubeWithColorSpace", parameters: [
        "inputCubeDimension": size,
        "inputCubeData": data,
        "inputColorSpace": CGColorSpace(name: CGColorSpace.sRGB)!,
    ])
}

func makeBackdrop(extent: CGRect) -> CIImage {
    let width = extent.width, height = extent.height
    let base = CIFilter.linearGradient()
    base.point0 = CGPoint(x: 0, y: height)
    base.color0 = backdropTop.ci()
    base.point1 = CGPoint(x: 0, y: 0)
    base.color1 = backdropBottom.ci()

    func glow(_ color: Rgb, alpha: CGFloat, center: CGPoint, radius: CGFloat) -> CIImage {
        let radial = CIFilter.radialGradient()
        radial.center = center
        radial.radius0 = 0
        radial.radius1 = Float(radius)
        radial.color0 = color.ci(alpha: alpha)
        radial.color1 = color.ci(alpha: 0)
        return radial.outputImage!
    }

    let cyan = glow(accentCyan, alpha: 0.2, center: CGPoint(x: width * 0.08, y: height * 0.95), radius: width * 0.95)
    let burgundy = glow(brandBright, alpha: 0.13, center: CGPoint(x: width * 0.98, y: height * 0.05), radius: width * 0.9)
    return burgundy.composited(over: cyan.composited(over: base.outputImage!)).cropped(to: extent)
}

func writeJpeg(_ image: CIImage, to path: String) {
    let context = CIContext()
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
    let options: [CIImageRepresentationOption: Any] = [
        CIImageRepresentationOption(rawValue: kCGImageDestinationLossyCompressionQuality as String): jpegQuality,
    ]
    do {
        try context.writeJPEGRepresentation(of: image, to: URL(fileURLWithPath: path), colorSpace: colorSpace, options: options)
    } catch {
        fail("zapis: \(error.localizedDescription)")
    }
}

let arguments = CommandLine.arguments.dropFirst()
let paths = arguments.filter { !$0.hasPrefix("--") }
guard paths.count == 2 else { fail("użycie: team-backdrop <wejście> <wyjście.jpg> [--despill]") }

let input = loadInput(paths[0])
let mask = refine(mask: foregroundMask(for: input), extent: input.extent)
let foreground = arguments.contains("--despill") ? despill(input) : input
let composite = foreground.applyingFilter("CIBlendWithMask", parameters: [
    kCIInputBackgroundImageKey: makeBackdrop(extent: input.extent),
    kCIInputMaskImageKey: mask,
])
writeJpeg(composite, to: paths[1])
print("\(paths[1]) \(Int(input.extent.width))×\(Int(input.extent.height))")
