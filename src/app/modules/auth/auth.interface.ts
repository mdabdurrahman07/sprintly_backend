export interface IUserRegisterPayload {
    name: string,
    email: string,
    password:string,
    member:{
        skills: string[]
    }
}

export interface IUserLoginPayload {
    email: string,
    password:string,
}

export interface IVerifyEmailPayload {
	email: string;
	otp : string;
}
export interface IGoogleLoginPayload {
	idToken: string;
}