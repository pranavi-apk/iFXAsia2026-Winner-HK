import AppKit
import Foundation
import Vision

guard CommandLine.arguments.count > 1 else {
    fputs("usage: ocr_vision image.png\n", stderr)
    exit(2)
}

let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let image = NSImage(contentsOf: url) else {
    fputs("could not open image\n", stderr)
    exit(2)
}
var rect = NSRect(origin: .zero, size: image.size)
guard let cgImage = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else {
    fputs("could not read pixels\n", stderr)
    exit(2)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
request.recognitionLanguages = ["en-US", "zh-Hans", "zh-Hant"]

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try handler.perform([request])

let lines = (request.results ?? [])
    .sorted { $0.boundingBox.origin.y > $1.boundingBox.origin.y }
    .compactMap { $0.topCandidates(1).first?.string }
print(lines.joined(separator: "\n"))
