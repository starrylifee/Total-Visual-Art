import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * 로컬 개발용 /api 처리 플러그인
 * 배포(Vercel)에서는 api/ 폴더가 서버리스 함수로 동작하고,
 * 로컬(npm run dev)에서는 이 플러그인이 같은 핸들러를 실행한다.
 */
function localApiPlugin(env) {
    return {
        name: 'local-api-dev',
        configureServer(server) {
            // 서버 전용 환경변수 주입 (VITE_ 접두사 없는 값)
            for (const key of ['GEMINI_API_KEY', 'GROUND_API_KEY', 'GROUND_CLASS_ID']) {
                if (env[key]) process.env[key] = env[key]
            }

            server.middlewares.use('/api', async (req, res, next) => {
                const name = (req.url || '').split('?')[0].replace(/^\/+|\/+$/g, '')
                const file = path.resolve(process.cwd(), 'api', `${name}.js`)
                if (!name || !fs.existsSync(file)) return next()

                try {
                    // 요청 본문(JSON) 파싱 — Vercel의 req.body와 동일하게
                    let raw = ''
                    for await (const chunk of req) raw += chunk
                    req.body = raw ? JSON.parse(raw) : {}
                } catch {
                    res.statusCode = 400
                    res.setHeader('Content-Type', 'application/json')
                    return res.end(JSON.stringify({ error: '잘못된 JSON 본문입니다.' }))
                }

                // Vercel 스타일 res 헬퍼
                res.status = (code) => { res.statusCode = code; return res }
                res.json = (obj) => {
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify(obj))
                    return res
                }

                try {
                    // 캐시 무효화 import — api 파일 수정 시 서버 재시작 불필요
                    const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`)
                    await mod.default(req, res)
                } catch (error) {
                    console.error(`[local-api] /api/${name} 오류:`, error)
                    if (!res.writableEnded) {
                        res.statusCode = 500
                        res.setHeader('Content-Type', 'application/json')
                        res.end(JSON.stringify({ error: error.message }))
                    }
                }
            })
        },
    }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    return {
        plugins: [react(), localApiPlugin(env)],
    }
})
