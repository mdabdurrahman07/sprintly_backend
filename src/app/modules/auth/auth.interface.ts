export interface IUserRegisterPayload {
    name: string,
    email: string,
    password:string,
    member:{
        skills:[]
    }
}

export interface IUserLoginPayload {
    email: string,
    password:string,
}