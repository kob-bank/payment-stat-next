export interface IConfigService {
    getDatabases(): Promise<string[]>;
    saveDatabases(databases: string[]): Promise<void>;
}
