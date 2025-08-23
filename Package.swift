// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Junction",
    platforms: [
       .macOS(.v13)
    ],
    dependencies: [
        // 💧 A server-side Swift web framework.
        .package(url: "https://github.com/vapor/vapor.git", from: "4.115.0"),
        // 🍃 An expressive, performant, and extensible templating language built for Swift.
        .package(url: "https://github.com/vapor/leaf.git", from: "4.3.0"),
        // 📊 Excel file processing
        .package(url: "https://github.com/CoreOffice/CoreXLSX.git", from: "0.14.0"),
    ],
    targets: [
        .executableTarget(
            name: "Junction",
            dependencies: [
                .product(name: "Vapor", package: "vapor"),
                .product(name: "Leaf", package: "leaf"),
                .product(name: "CoreXLSX", package: "CoreXLSX"),
            ]
        ),
    ]
)
