import Vapor
import Leaf
import CoreXLSX

@main
struct App {
    static func main() async throws {
        let app = try await Application.make()
        
        // Leaf 템플릿 엔진 설정
        app.views.use(.leaf)
        
        // 정적 파일 제공을 위한 미들웨어 설정
        app.middleware.use(FileMiddleware(publicDirectory: app.directory.publicDirectory))
        
        // HTTP 서버 설정 - 파일 크기 제한 늘리기
        app.http.server.configuration.maxBodySize = 100 * 1024 * 1024 // 100MB
        
        // 메인 페이지 라우트
        app.get { req async throws -> View in
            return try await req.view.render("index", ["name": "문창재"])
        }
        
        // 건설 예산 검증 서비스 메인 페이지
        app.get("budget") { req async throws -> View in
            return try await req.view.render("budget/index")
        }
        
        // 드래그 앤 드롭 페이지
        app.get("upload") { req async throws -> View in
            return try await req.view.render("upload/index")
        }
        
        // 파일 업로드 처리
        app.post("upload") { req async throws -> View in
            do {
                // 파일 업로드 처리
                let uploadedFile = try req.content.decode(FileUpload.self)
                
                // 파일 저장
                let uploadDir = app.directory.workingDirectory + "Uploads"
                try FileManager.default.createDirectory(atPath: uploadDir, withIntermediateDirectories: true)
                
                let fileName = uploadedFile.filename ?? "uploaded_file.xlsx"
                let filePath = uploadDir + "/" + fileName
                
                try uploadedFile.data.write(to: URL(fileURLWithPath: filePath))
                
                // 성공 메시지
                return try await req.view.render("upload/result", [
                    "message": "파일이 성공적으로 업로드되었습니다.",
                    "fileName": fileName
                ])
                
            } catch {
                // 에러 처리
                return try await req.view.render("upload/result", [
                    "message": "파일 업로드에 실패했습니다: \(error.localizedDescription)",
                    "fileName": ""
                ])
            }
        }
        
        // 서버 시작
        try await app.execute()
    }
}

// 파일 업로드 구조체
struct FileUpload: Content {
    let data: Data
    let filename: String?
}
