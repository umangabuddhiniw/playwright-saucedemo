// src/types/credentials.d.ts

// Export the interfaces directly
export interface UserCredentials {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    postalCode: string;
}

export interface CredentialsData {
    users: UserCredentials[];
}

// Keep the module declaration for JSON imports
declare module '../../data/credentials.json' {
    const value: CredentialsData;
    export default value;
}