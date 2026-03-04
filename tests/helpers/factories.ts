let counter = 0;
function nextId() {
    counter++;
    return `test-uuid-${counter}`;
}

export function makeUser(overrides: Record<string, any> = {}) {
    const id = overrides.id ?? nextId();
    return {
        id,
        name: "Test User",
        email: `testuser-${id}@test.com`,
        phone: `910000${String(counter).padStart(4, "0")}`,
        pass: "$2a$10$hashedpassword",
        role: "Student" as const,
        ...overrides,
    };
}

export function makeResume(overrides: Record<string, any> = {}) {
    return {
        id: overrides.id ?? nextId(),
        userId: overrides.userId ?? nextId(),
        skills: ["TypeScript", "Node.js"],
        achievements: ["Hackathon winner"],
        location: "Mumbai",
        yearsOfExperience: 1,
        projects: [],
        workExp: [],
        ...overrides,
    };
}

export function makeJob(overrides: Record<string, any> = {}) {
    return {
        id: overrides.id ?? nextId(),
        title: "Backend Engineer",
        company: "TechCorp",
        description: "Build scalable APIs with Node.js and PostgreSQL",
        location: "Mumbai",
        salary: "12-18 LPA",
        requiredExperience: 1,
        createdById: overrides.createdById ?? nextId(),
        createdAt: new Date("2026-01-01"),
        ...overrides,
    };
}

export function resetFactoryCounter() {
    counter = 0;
}
