import FileUpload from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { LogIn } from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();
  const isAuth = !!userId;
  return (
    <div className="w-screen min-h-screen bg-gradient-to-r from-cyan-100 to-blue-400">
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex items-center">
            <h1 className="mr-3 text-5xl font-bold"> Chat avec ton PDF</h1>
            <UserButton />
          </div>
          <div className="flex mt-2">
            {isAuth && <Button> Go to Chats</Button>}
          </div>

          <p className="max-w-xl mt-1 text-lg text-slate-600 justify-center">
            Rejoignez des millions d’utilisateurs qui transforment leurs PDF en
            assistants interactifs. Posez des questions, résumez ou explorez vos
            documents en toute simplicité grâce à l’IA.
          </p>
          <div className="w-full mt-4">
            {isAuth ? (
              <FileUpload />
            ) : (
              <Link href="/sign-in">
                <Button>
                  Connectez vous pour commencer !
                  <LogIn className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
