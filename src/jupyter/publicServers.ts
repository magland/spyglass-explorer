export interface PublicServer {
  name: string;
  url: string;
  description?: string;
}

export const publicServers: PublicServer[] = [
  {
    name: "jupyter1",
    url: "https://jupyter1.nbfiddle.org",
    description: "Public server 1",
  }
];
