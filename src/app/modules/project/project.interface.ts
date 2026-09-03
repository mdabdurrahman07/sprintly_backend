export interface IProjectPayload {
    name: string,
    description?: string,
}

export interface IProjectUpdatePayload {
    name?: string
    description?: string
}