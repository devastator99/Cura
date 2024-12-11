import { v } from "convex/values";
import { mutation } from "./_generated/server";
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export async function uploadFileToS3(fileBuffer, fileName, mimeType) {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimeType,
  };

  const uploadResult = await s3.upload(params).promise();
  return uploadResult.Location; // File URL
}


export const uploadFile = mutation({
  args: {
    userId: v.string(),
    file: v.upload(), // Expect a file object
  },
  handler: async (ctx, args) => {
    const { userId, file } = args;

    const fileUrl = await uploadFileToS3(file.buffer, file.originalname, file.mimetype);

    return await ctx.db.insert("files", {
      fileId: crypto.randomUUID(),
      userId,
      fileName: file.originalname,
      fileUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});
