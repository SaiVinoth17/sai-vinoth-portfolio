export const CANONICAL_PROJECTS = {
    'gaming-kingdom': {
        id: 'gaming-kingdom',
        name: 'Gaming Kingdom',
        title: 'Gaming Kingdom',
        category: 'Web Project',
        industry: 'Gaming & Entertainment',
        description: 'A modern gaming-focused web experience.',
        url: 'https://ootythegamingkingdom.com/',
        technologies: ['HTML', 'CSS', 'JavaScript'],
        tags: ['HTML', 'CSS', 'JavaScript'],
        useCases: ['gaming', 'entertainment', 'community', 'news', 'portal']
    },
    'nilgiris-explorers': {
        id: 'nilgiris-explorers',
        name: 'Nilgiris Explorers',
        title: 'Nilgiris Explorers',
        category: 'Tourism / Travel',
        industry: 'Tourism & Hospitality',
        description: 'A comprehensive travel and tourism portal built for discovering the Nilgiris district, local spots, and tourist experiences.',
        url: 'https://nilgirisexplorers.com/',
        technologies: ['React', 'Next.js', 'Tailwind CSS'],
        tags: ['React', 'Next.js', 'Tailwind CSS'],
        useCases: ['tourism', 'travel', 'hotel', 'resort', 'guide', 'hospitality']
    },
    'ooty-mistwings': {
        id: 'ooty-mistwings',
        name: 'Ooty Mistwings',
        title: 'Ooty Mistwings',
        category: 'Hospitality & Stays',
        industry: 'Hospitality & Nature Stays',
        description: 'A modern resort and hospitality web platform highlighting nature stays, local nature attractions, and bookings in Ooty.',
        url: 'https://ootymistwings.com/',
        technologies: ['HTML', 'CSS', 'JavaScript'],
        tags: ['HTML', 'CSS', 'JavaScript'],
        useCases: ['resort', 'hotel', 'hospitality', 'booking', 'vacation']
    },
    'house-of-petalss': {
        id: 'house-of-petalss',
        name: 'House Of Petalss',
        title: 'House Of Petalss',
        category: 'E-Commerce / Floral Services',
        industry: 'Retail & E-Commerce',
        description: 'An elegant digital storefront showcasing floral designs, custom arrangements, and artisanal gifts.',
        url: 'https://houseofpetalss.netlify.app/',
        technologies: ['React', 'Tailwind CSS', 'JavaScript'],
        tags: ['React', 'Tailwind CSS', 'JavaScript'],
        useCases: ['ecommerce', 'shop', 'store', 'floral', 'gifts', 'retail']
    }
}

export const CANONICAL_CONTACT = {
    name: 'Sai Vinoth',
    whatsapp: '7604904217',
    countryCode: '91',
    formattedWhatsApp: '+91 7604904217',
    email: 'saivinothdeveloper@gmail.com',
    github: 'https://github.com/SaiVinoth17',
    portfolio: 'https://saivinoth.netlify.app/'
}

export const sai = {
    name: 'Sai Vinoth',
    role: 'Freelance Web Developer',
    about: 'Sai Vinoth works as a freelance web developer, building modern, high-performance websites and web applications for clients and businesses.',
    identity: {
        name: 'Sai Vinoth',
        role: 'Freelance Web Developer',
        aiName: 'Sai AI',
        brandName: 'Sai Vinoth',
        shortBrand: 'SaiRio',
        location: 'India',
        introText: "Hey! I'm Sai AI — Sai Vinoth's portfolio assistant. I can help you explore his work, projects, skills, and how to get in touch.",
        bio: 'Sai Vinoth works as a freelance web developer, building modern websites and web applications for clients and businesses.',
        github: CANONICAL_CONTACT.github,
        portfolio: CANONICAL_CONTACT.portfolio
    },
    experience: [
        {
            id: 'freelance-web-developer',
            role: 'Freelance Web Developer',
            type: 'Freelance',
            description: 'Sai Vinoth works as a freelance web developer, building modern websites and web applications for clients and businesses.',
            company: null,
            startDate: null,
            endDate: null
        }
    ],
    skills: {
        Frontend: ['HTML', 'CSS', 'JavaScript', 'React', 'Next.js', 'Tailwind CSS'],
        Backend: ['Python', 'Django', 'Node.js'],
        Database: ['SQL', 'MongoDB'],
        Tools: ['Git', 'GitHub']
    },
    projects: Object.values(CANONICAL_PROJECTS),
    contact: CANONICAL_CONTACT,
    socialLinks: {
        github: CANONICAL_CONTACT.github
    }
}

// Tool functions
export function getProjects() {
    return Object.values(CANONICAL_PROJECTS)
}

export function getProject(projectId = '') {
    if(!projectId) return null
    const key = Object.keys(CANONICAL_PROJECTS).find(k => k === projectId.toLowerCase() || projectId.toLowerCase().includes(k))
    return CANONICAL_PROJECTS[key] || null
}

export function searchProjects(query = '') {
    const q = query.toLowerCase().trim()
    if(!q) return getProjects()
    return getProjects().filter(p => 
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.technologies.some(t => t.toLowerCase().includes(q)) ||
        p.useCases.some(u => u.toLowerCase().includes(q))
    )
}

export function getExperience() {
    return sai.experience
}

export function getSkills() {
    return sai.skills
}

export function getAbout() {
    return sai.about
}

export function getContact() {
    return sai.contact
}

export function buildWhatsAppUrl(customMessage = '') {
    const phone = '917604904217'
    const msg = customMessage || "Hi Sai, I found your portfolio and I'd like to discuss a project."
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}

export function buildMailtoUrl(subject = 'Project Inquiry — Sai Vinoth') {
    const email = 'saivinothdeveloper@gmail.com'
    return `mailto:${email}?subject=${encodeURIComponent(subject)}`
}

export function resolveAIAction(action) {
    if(!action) return null
    const type = (action.type || '').toLowerCase()
    const targetId = action.projectId || action.id || action.target || ''

    if(type === 'project') {
        const proj = getProject(targetId) || CANONICAL_PROJECTS['nilgiris-explorers']
        return {
            kind: 'external_url',
            url: proj.url,
            label: action.label || `View Project →`,
            title: proj.title,
            project: proj
        }
    }

    if(type === 'contact') {
        const contactType = (action.contactType || action.target || 'whatsapp').toLowerCase()
        if(contactType === 'whatsapp' || contactType === 'chat') {
            const msg = action.customMessage || "Hi Sai, I found your portfolio and I'd like to discuss a project."
            return {
                kind: 'external_url',
                url: buildWhatsAppUrl(msg),
                label: action.label || 'WhatsApp →'
            }
        }
        if(contactType === 'email') {
            const subject = action.subject || 'Project Inquiry — Sai Vinoth'
            return {
                kind: 'external_url',
                url: buildMailtoUrl(subject),
                label: action.label || 'Email Sai →'
            }
        }
    }

    if(type === 'github') {
        return {
            kind: 'external_url',
            url: CANONICAL_CONTACT.github,
            label: action.label || 'Open GitHub →'
        }
    }

    if(type === 'navigation' || type === 'navigate') {
        const section = action.target || action.section || 'projects'
        const validSections = ['projects', 'about', 'contact', 'home', 'social']
        if(!validSections.includes(section)) return null
        return {
            kind: 'internal_nav',
            target: section,
            label: action.label || `View ${section}`
        }
    }

    return null
}

export const SAI_KNOWLEDGE = sai
