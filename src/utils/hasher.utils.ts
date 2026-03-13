import bcrypt from "bcrypt";
import { config } from "../config";

export interface BcryptInterface {
  hash(password: string): string;
  comparePass(password: string, encrypted: string): Promise<boolean>;
}

class Bcrypt implements BcryptInterface {
  hash(password: string) {
    return bcrypt.hashSync(password, config.saltRounds);
  }

  async comparePass(password: string, encrypted: string) {
    return await bcrypt.compare(password, encrypted);
  }

  generateTempPassword(length: number = 10): string {
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  }
}
export default new Bcrypt();
