declare module '../../data/credentials.json' {
  interface User {
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    postalCode: string;
  }

  interface Credentials {
    users: User[];
  }

  const credentials: Credentials;
  export default credentials;
}