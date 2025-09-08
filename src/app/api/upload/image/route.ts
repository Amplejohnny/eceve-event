import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        {
          error: "No file received",
          code: "NO_FILE",
        },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Invalid file type. Only JPEG, PNG, and WebP are allowed.",
          code: "INVALID_TYPE",
          details: {
            received: file.type,
            allowed: allowedTypes,
          },
        },
        { status: 400 }
      );
    }

    // Validate file size (5MB max) - Enhanced error message
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File size too large. Maximum size is 5MB. Your file is ${(
            file.size /
            (1024 * 1024)
          ).toFixed(2)}MB.`,
          code: "FILE_TOO_LARGE",
          details: {
            fileSize: file.size,
            maxSize: maxSize,
            fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
            maxSizeMB: "5",
          },
        },
        { status: 400 }
      );
    }

    // Continue with existing upload logic...
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split(".").pop();
    const fileName = `event-${timestamp}-${randomString}.${fileExtension}`;

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const arrayBuffer = await file.arrayBuffer();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("events")
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        {
          error: "Failed to upload image to storage. Please try again.",
          code: "STORAGE_ERROR",
          details: uploadError.message,
        },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("events")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // console.log("Image uploaded successfully:", {
    //   fileName,
    //   size: file.size,
    //   type: file.type,
    //   url: imageUrl,
    // });

    return NextResponse.json({
      success: true,
      imageUrl,
      fileName,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      {
        error: "Internal server error during image upload",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
