import { ReqUser } from "../../middleware/checkAuth";
import { prisma } from "../../lib/prisma";
import { deleteFromCloudinary, uploadOnCloudinary } from "../../lib/cloudinary";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { IManagerProfileUpdate, IMemberProfileUpdate } from "./profile.interface";


const updateMemberProfile = async (
    payload: IMemberProfileUpdate,
    user: ReqUser,
    image?: Buffer,
) => {
    
    const existingUser = await prisma.user.findUnique({
        where:{
            id: user.userId,
            role: user.role
        },
        include: {
            memberProfile: true
        }
    })
    if(!existingUser){
        throw new AppError(httpStatus.BAD_REQUEST, "User not found")
    }
    if(!existingUser.memberProfile){
        throw new AppError(httpStatus.NOT_FOUND, "Member profile not found")
    }
    if(image && existingUser.memberProfile.memberProfileImagePublicId){
        await deleteFromCloudinary(existingUser.memberProfile.memberProfileImagePublicId)
    }

    const imageData = image
        ? await uploadOnCloudinary(image, {
            folder: "SprintlyUserprofileImages"
        })
        : undefined

    const updatedData = prisma.member.update({
        where: { userId: existingUser.id},
        data: {
            ...payload,
            ...(imageData && {
                memberAvatarUrl: imageData.secure_url,
                memberProfileImagePublicId: imageData.public_id
            })
        },
    });

    return updatedData
};
const updateManagerProfile = async (
    payload: IManagerProfileUpdate,
    user: ReqUser,
    image?: Buffer,
) => {
    
    const existingUser = await prisma.user.findUnique({
        where:{
            id: user.userId,
            role: user.role
        },
        include: {
            managerProfile: true
        }
    })
    if(!existingUser){
        throw new AppError(httpStatus.BAD_REQUEST, "User not found")
    }
    if(!existingUser.managerProfile){
        throw new AppError(httpStatus.NOT_FOUND, "Manager profile not found")
    }
    if(image && existingUser.managerProfile.managerProfileImagePublicId){
        await deleteFromCloudinary(existingUser.managerProfile.managerProfileImagePublicId)
    }

    const imageData = image
        ? await uploadOnCloudinary(image, {
            folder: "SprintlyManagerprofileImages"
        })
        : undefined

    const updatedData = prisma.manager.update({
        where: { userId: existingUser.id},
        data: {
            ...payload,
            ...(imageData && {
                managerAvatarUrl: imageData.secure_url,
                managerProfileImagePublicId: imageData.public_id
            })
        },
    });

    return updatedData
};

export const userServices = {
    updateMemberProfile,
    updateManagerProfile
}