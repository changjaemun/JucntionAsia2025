import Vapor
import Leaf

@main
struct App {
    static func main() async throws {
        let app = try await Application.make()
        
        // Leaf 템플릿 엔진 설정
        app.views.use(.leaf)
        
        // 정적 파일 제공을 위한 미들웨어 설정
        app.middleware.use(FileMiddleware(publicDirectory: app.directory.publicDirectory))
        
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
        
        // 서버 시작
        try await app.execute()
    }
}
