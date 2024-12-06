"use client";
import { uploadToS3 } from "@/lib/s3";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Inbox, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";

import { useRouter } from "next/navigation";
import React from "react";

const FileUpload = () => {
  const router = useRouter();
  const [uploading, setUploading] = React.useState(false);
  const { mutate, isPending } = useMutation({
    mutationFn: async ({
      file_key,
      file_name,
    }: {
      file_key: string;
      file_name: string;
    }) => {
      const response = await axios.post<{ chat_id: string }>(
        "/api/create-chat",
        {
          file_key,
          file_name,
        }
      );
      return response.data;
    },
  });

  //Téléverser les PDF et enregistrer les fichiers sur s3 AWS
  const { getRootProps, getInputProps } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      // console.log("Accepted files:", acceptedFiles);
      const file = acceptedFiles[0];
      if (file.size > 10 * 1024 * 1024) {
        //Supérieur à 10mb
        toast.error("Le fichier est trop lourd !");
        return;
      }

      try {
        setUploading(true);
        const data = await uploadToS3(file);
        if (!data?.file_key || !data.file_name) {
          toast.error("Une erreur est survenue");
          return;
        }
        mutate(data, {
          onSuccess: ({ chat_id }: { chat_id: string }) => {
            toast.success("Discussion commencée");
            router.push(`/chat/${chat_id}`);
          },
          onError: (error) => {
            toast.error("Impossible de commencer la discussion");
            console.error(error);
          },
        });
      } catch (error) {
        toast.error("Une erreur est survenue lors du téléversement");
      } finally {
        setUploading(false);
      }
    },
  });
  return (
    <div className="p-2 bg-white rounded-xl">
      <div
        {...getRootProps({
          className:
            "border-dashed border-2 rounded-xl cursor-pointer bg-gray-50 py-8 flex justify-center items-center flex-col",
        })}
      >
        <input {...getInputProps()} />
        {uploading || isPending ? (
          <>
            {/*Chargement*/}
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="mt-2 text-sm text-slate-400">
              Spilling Tea to GPT...
            </p>
          </>
        ) : (
          <>
            <Inbox className="w-10 h-10 text-blue-500" />
            <p className="mt-2 text-sm text-slate-400"> Déposez un PDF ici </p>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
