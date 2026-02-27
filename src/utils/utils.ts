import bcrypt from "bcryptjs";

const saltRounds = 10;

export const encrypt = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, saltRounds);
};

export const verifyPass = async (
    password: string,
    hash: string
): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
};