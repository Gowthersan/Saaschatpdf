"use client";

import { DrizzleChat } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import axios from "axios";
import { MessageCircle, PlusCircle } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";
import SubscriptionButton from "./SubscriptionButton";

type Props = {
  chats: DrizzleChat[];
  chatId: number;
  isPro: boolean;
};

const ChatSideBar = ({ chatId, chats, isPro }: Props) => {
  const [loading, setLoading] = React.useState(false);

  return (
    <div className="w-full h-screen p-4 text-gray-200 bg-gray-900">
      <Link href={"/"}>
        <Button className="w-full border-dashed border-white border">
          <PlusCircle className="mr-2 w-4 h-4" />
          New Chat
        </Button>
      </Link>

      <div className="flex max-h-screen  pb-20 flex-col gap-2 mt-4">
        {chats.map((chat) => (
          <Link href={`/chat/${chat.id}`} key={chat.id}>
            <div
              className={cn("rounded-lg p-3 flex text-slate-300 items-center", {
                "bg-blue-600 text-white": chat.id === chatId,
                "hover:text-white": chat.id !== chatId,
              })}
            >
              <MessageCircle className="mr-2" />
              <p className="w-full overflow-hidden text-sm truncate whitespace-nowrap text-ellipsis">
                {chat.pdfname}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="absolute bottom-4 left-4">
        <div className="flex gap-2 items-center text-sm text-slate-500 flex-wrap">
          <Link href="/"> Home </Link>
          <Link href="/"> Source</Link>
        </div>
        <SubscriptionButton isPro={isPro} />
      </div>
    </div>
  );
};

export default ChatSideBar;
