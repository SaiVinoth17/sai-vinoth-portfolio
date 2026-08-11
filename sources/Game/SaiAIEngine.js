import { 
    sai, 
    getProjects, 
    getProject, 
    searchProjects, 
    getExperience, 
    getSkills, 
    getAbout, 
    getContact, 
    buildWhatsAppUrl, 
    buildMailtoUrl, 
    resolveAIAction 
} from '../data/sai-ai.js'
import { Game } from './Game.js'
import { SaiAIAnalytics } from './SaiAIAnalytics.js'

export class SaiAIEngine
{
    constructor()
    {
        this.game = Game.getInstance()
        this.history = []
        this.requestTimestamps = []
        this.currentAbortController = null

        this.apiKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY || import.meta.env.VITE_LLM_API_KEY || ''
        this.model = import.meta.env.VITE_LLM_MODEL || import.meta.env.LLM_MODEL || 'openai/gpt-oss-20b'
    }

    checkRateLimit()
    {
        const now = Date.now()
        this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000)
        if(this.requestTimestamps.length >= 10) {
            return false
        }
        this.requestTimestamps.push(now)
        return true
    }

    getTools()
    {
        return {
            getProjects: () => getProjects(),
            getProject: (id) => getProject(id),
            searchProjects: (q) => searchProjects(q),
            getExperience: () => getExperience(),
            getSkills: () => getSkills(),
            getAbout: () => getAbout(),
            getContact: () => getContact(),
            resolveAction: (action) => resolveAIAction(action)
        }
    }

    async processMessage(userText, onChunk = null)
    {
        const text = (userText || '').trim()

        if(!text) {
            return {
                statusText: 'Waiting for input...',
                text: "Feel free to ask about Sai's projects, skills, or experience!",
                components: [],
                cards: [],
                actions: []
            }
        }

        if(text.length > 500) {
            return {
                statusText: 'Input too long',
                text: "Please keep your question short and concise.",
                components: [],
                cards: [],
                actions: []
            }
        }

        if(!this.checkRateLimit()) {
            return {
                statusText: 'Rate limit exceeded',
                text: "You're sending messages quickly! Please wait a moment before sending another.",
                components: [],
                cards: [],
                actions: []
            }
        }

        SaiAIAnalytics.trackEvent('question_submitted', { text })
        this.history.push({ role: 'user', content: text })

        if(this.apiKey) {
            try {
                return await this.processWithGroqStream(text, onChunk)
            } catch (err) {
                console.warn('AI API error, executing local engine tool pipeline:', err)
            }
        }

        return this.processWithLocalEngine(text)
    }

    processWithLocalEngine(text)
    {
        const lower = text.toLowerCase().trim()
        const tools = this.getTools()

        // 1. Strict Anti-Hallucination Guard for unverified fields
        const unverifiedKeywords = ['salary', 'earnings', 'client list', 'past clients', 'client names', 'who are sai\'s clients', 'award', 'years of experience']
        if(unverifiedKeywords.some(kw => lower.includes(kw))) {
            return {
                statusText: 'Checking verified knowledge...',
                text: "I don't have verified information about that.",
                components: [
                    { type: 'navigation', target: 'projects', label: 'View Projects' },
                    { type: 'navigation', target: 'contact', label: 'Contact Sai' }
                ],
                cards: [],
                actions: []
            }
        }

        // 2. Reject third-party entities
        if(lower.includes('bruno') || lower.includes('bruno simon')) {
            const allProjects = tools.getProjects()
            return {
                statusText: 'Portfolio Assistant',
                text: "I don't have information about that. I can share Sai Vinoth's portfolio projects: Nilgiris Explorers, Gaming Kingdom, Ooty Mistwings, and House Of Petalss.",
                components: [
                    { type: 'project-list', projectIds: allProjects.map(p => p.id) }
                ],
                cards: [],
                actions: []
            }
        }

        // 3. Simple Greetings ("Hey", "Hello", "Hi")
        if(lower === 'hey' || lower === 'hello' || lower === 'hi' || lower === 'hey!') {
            return {
                statusText: 'Sai AI Assistant',
                text: "Hey! 👋 I'm Sai AI. I can help you explore Sai Vinoth's projects, skills, experience, or help you get in touch.",
                components: [],
                cards: [],
                actions: []
            }
        }

        // 4. All Projects Queries ("Show me your projects", "Show me Sai's projects", "What projects has Sai built?", "Show me his work", "Can I see the projects?", "Portfolio projects?", "What websites has Sai made?")
        if(lower.includes('projects') || lower.includes('show work') || lower.includes('show me his work') || lower.includes('show me your projects') || lower.includes('built') || lower.includes('websites has sai made')) {
            const allProjects = tools.getProjects()
            return {
                statusText: "Sai Vinoth's Projects",
                text: "Sure — here's some of Sai's work.",
                components: [
                    { type: 'project-list', projectIds: allProjects.map(p => p.id) }
                ],
                cards: [],
                actions: []
            }
        }

        // 5. Specific Project Queries
        if(lower.includes('gaming kingdom')) {
            const p = tools.getProject('gaming-kingdom')
            return {
                statusText: 'Gaming Kingdom',
                text: "Gaming Kingdom is a modern gaming-focused web experience built with HTML, CSS, and JavaScript.",
                components: [
                    { type: 'project', projectId: p.id }
                ],
                cards: [],
                actions: []
            }
        }

        if(lower.includes('nilgiris explorers') || lower.includes('nilgiris')) {
            const p = tools.getProject('nilgiris-explorers')
            return {
                statusText: 'Nilgiris Explorers',
                text: "Nilgiris Explorers is a comprehensive travel and tourism portal built for discovering the Nilgiris district, local spots, and tourist experiences using React, Next.js, and Tailwind CSS.",
                components: [
                    { type: 'project', projectId: p.id }
                ],
                cards: [],
                actions: []
            }
        }

        if(lower.includes('ooty mistwings') || lower.includes('mistwings')) {
            const p = tools.getProject('ooty-mistwings')
            return {
                statusText: 'Ooty Mistwings',
                text: "Ooty Mistwings is a modern resort and hospitality web platform highlighting nature stays, local nature attractions, and bookings in Ooty.",
                components: [
                    { type: 'project', projectId: p.id }
                ],
                cards: [],
                actions: []
            }
        }

        if(lower.includes('house of petalss') || lower.includes('petalss')) {
            const p = tools.getProject('house-of-petalss')
            return {
                statusText: 'House Of Petalss',
                text: "House Of Petalss is an elegant digital storefront showcasing floral designs, custom arrangements, and artisanal gifts built with React and Tailwind CSS.",
                components: [
                    { type: 'project', projectId: p.id }
                ],
                cards: [],
                actions: []
            }
        }

        // 6. Project Recommendation Queries ("tourism", "gaming related", etc.)
        if(lower.includes('tourism') || lower.includes('travel') || lower.includes('hotel') || lower.includes('resort')) {
            return {
                statusText: 'Project recommendation...',
                text: "Nilgiris Explorers is the closest match in Sai's portfolio.",
                components: [
                    { type: 'project', projectId: 'nilgiris-explorers' }
                ],
                cards: [],
                actions: []
            }
        }

        if(lower.includes('gaming related') || lower.includes('game project')) {
            return {
                statusText: 'Project recommendation...',
                text: "Gaming Kingdom would be the best match.",
                components: [
                    { type: 'project', projectId: 'gaming-kingdom' }
                ],
                cards: [],
                actions: []
            }
        }

        // 7. Direct WhatsApp Query
        if(lower.includes('whatsapp')) {
            return {
                statusText: 'WhatsApp Contact',
                text: "You can reach Sai Vinoth on WhatsApp at **+91 7604904217**.",
                components: [
                    { type: 'contact', contactType: 'whatsapp', title: 'WhatsApp Contact', description: 'Reach out directly on WhatsApp to discuss your project.' }
                ],
                cards: [],
                actions: []
            }
        }

        // 8. Direct Email Query
        if(lower.includes('email')) {
            return {
                statusText: 'Email Contact',
                text: "You can email Sai Vinoth directly at **saivinothdeveloper@gmail.com**.",
                components: [
                    { type: 'contact', contactType: 'email', title: 'Email Contact', description: 'Send an email to discuss your project requirements.' }
                ],
                cards: [],
                actions: []
            }
        }

        // 9. Hire / Contact Intent Detection
        const hireIntents = [
            'hire', 'i want to hire', 'can i hire', 'have a project', 'work with sai', 
            'need a developer', 'need a website', 'let\'s work together', 'lets work together',
            'how do i get in touch', 'contact sai', 'reach sai', 'build something for me',
            'discuss a project', 'have a website project', 'build a website'
        ]
        if(hireIntents.some(intent => lower.includes(intent))) {
            SaiAIAnalytics.trackEvent('hire_intent_detected', { text })
            
            return {
                statusText: 'Work with Sai',
                text: "Absolutely! If you have a project in mind, you can reach Sai directly.",
                components: [
                    { type: 'contact', title: "Let's work together", description: "Have a website or web app project in mind?" }
                ],
                cards: [],
                actions: []
            }
        }

        // 10. Skills / Technologies Request
        if(lower.includes('skill') || lower.includes('technolog') || lower.includes('stack') || lower.includes('tools')) {
            return {
                statusText: "Sai's Skills & Technologies",
                text: "Sai works with modern frontend, backend, database, and tool stack:",
                components: [
                    { type: 'skills' }
                ],
                cards: [],
                actions: []
            }
        }

        // 11. Work Experience Request ("What is Sai's experience?", "Where has Sai worked?", "Tell me about his career")
        if(lower.includes('experience') || lower.includes('work experience') || lower.includes('career') || lower.includes('where has sai worked') || lower.includes('background') || lower.includes('history')) {
            return {
                statusText: 'Work experience...',
                text: "Here is Sai's verified work experience:",
                components: [
                    { type: 'experience' }
                ],
                cards: [],
                actions: []
            }
        }

        // 12. GitHub Request
        if(lower.includes('github') || lower.includes('repo') || lower.includes('source code')) {
            return {
                statusText: 'Public repositories...',
                text: "Check out Sai Vinoth's public repositories and open-source code on GitHub.",
                components: [
                    { type: 'github', title: 'GitHub', subtitle: "Sai Vinoth's public work" }
                ],
                cards: [],
                actions: []
            }
        }

        // 13. Single Technology Check
        if(lower.includes('react') || lower.includes('next') || lower.includes('python') || lower.includes('django') || lower.includes('javascript') || lower.includes('node') || lower.includes('sql') || lower.includes('mongodb') || lower.includes('css') || lower.includes('html')) {
            let matchedTech = 'React'
            if(lower.includes('next')) matchedTech = 'Next.js'
            else if(lower.includes('python')) matchedTech = 'Python'
            else if(lower.includes('django')) matchedTech = 'Django'
            else if(lower.includes('node')) matchedTech = 'Node.js'
            else if(lower.includes('sql')) matchedTech = 'SQL'
            else if(lower.includes('mongodb')) matchedTech = 'MongoDB'
            else if(lower.includes('javascript')) matchedTech = 'JavaScript'
            else if(lower.includes('css')) matchedTech = 'CSS'
            else if(lower.includes('html')) matchedTech = 'HTML'

            return {
                statusText: 'Technology inquiry',
                text: `Yes — ${matchedTech} is one of Sai's core technologies for web development.`,
                components: [],
                cards: [],
                actions: []
            }
        }

        // 14. Contextual Follow-up ("Can Sai build something similar?", "What technologies?")
        const recentHistory = this.history.slice(-4).map(h => h.content.toLowerCase()).join(' ')
        if(lower.includes('similar') || lower.includes('build something like') || lower.includes('can he build something like that')) {
            return {
                statusText: 'Contextual response',
                text: "Yes, that's the kind of web work Sai focuses on. If you'd like to discuss your project, I can connect you with him.",
                components: [
                    { type: 'contact', title: 'Discuss Project' }
                ],
                cards: [],
                actions: []
            }
        }

        // 15. Identity / About Query ("Who is Sai?", "What does Sai do?")
        if(lower.includes('who is sai') || lower.includes('what does sai do') || lower.includes('about sai')) {
            return {
                statusText: 'About Sai Vinoth',
                text: "Sai works mainly with React, Next.js, JavaScript, Python and Django, with a strong focus on building modern web experiences.",
                components: [],
                cards: [],
                actions: [
                    { type: 'navigation', target: 'projects', label: 'View Projects' },
                    { type: 'contact', contactType: 'whatsapp', label: 'Work with Sai →' }
                ]
            }
        }

        // Default Fallback
        return {
            statusText: 'Portfolio Assistant',
            text: "I can help you explore Sai's work, projects, skills, or discuss a potential project.",
            components: [],
            cards: [],
            actions: [
                { type: 'navigation', target: 'projects', label: 'View Projects' },
                { type: 'contact', contactType: 'whatsapp', label: 'Contact Sai →' }
            ]
        }
    }

    async processWithGroqStream(text, onChunk)
    {
        if(this.currentAbortController) {
            this.currentAbortController.abort()
        }
        this.currentAbortController = new AbortController()

        const systemPrompt = `You are Sai AI, the portfolio assistant for Sai Vinoth, a freelance web developer.
Your job is to help visitors understand Sai's work, projects, skills and how to contact him.
Never invent information.
Never invent project URLs.
Be friendly, conversational and concise.
Never pretend to literally be Sai Vinoth.`

        const messages = [
            { role: 'system', content: systemPrompt },
            ...this.history.slice(-6)
        ]

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            signal: this.currentAbortController.signal,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                messages: messages,
                temperature: 0.2,
                max_tokens: 250,
                stream: true
            })
        })

        if(!response.ok) {
            throw new Error(`API returned status ${response.status}`)
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let fullText = ''

        while(true) {
            const { done, value } = await reader.read()
            if(done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for(const line of lines) {
                if(line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const json = JSON.parse(line.substring(6))
                        const contentChunk = json.choices[0]?.delta?.content || ''
                        if(contentChunk) {
                            fullText += contentChunk
                            if(onChunk) onChunk(fullText)
                        }
                    } catch (e) {
                        // ignore malformed SSE line
                    }
                }
            }
        }

        this.history.push({ role: 'assistant', content: fullText })

        // Extract components from deterministic intent pipeline for tool results
        const localResult = this.processWithLocalEngine(text)

        return {
            statusText: 'Sai AI Assistant',
            text: fullText,
            components: localResult.components || [],
            cards: localResult.cards || [],
            actions: localResult.actions || []
        }
    }
}
