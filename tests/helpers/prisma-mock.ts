import { vi } from "vitest";

function createModelMock() {
    return {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
    };
}

export const prismaMock = {
    user: createModelMock(),
    resume: createModelMock(),
    job: createModelMock(),
    application: createModelMock(),
    project: createModelMock(),
    workExperience: createModelMock(),
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
    $disconnect: vi.fn(),
};

export function resetPrismaMock() {
    const resetModel = (model: ReturnType<typeof createModelMock>) => {
        Object.values(model).forEach((fn) => fn.mockReset());
    };
    resetModel(prismaMock.user);
    resetModel(prismaMock.resume);
    resetModel(prismaMock.job);
    resetModel(prismaMock.application);
    resetModel(prismaMock.project);
    resetModel(prismaMock.workExperience);
    prismaMock.$queryRawUnsafe.mockReset();
    prismaMock.$executeRawUnsafe.mockReset();
    prismaMock.$disconnect.mockReset();
}
