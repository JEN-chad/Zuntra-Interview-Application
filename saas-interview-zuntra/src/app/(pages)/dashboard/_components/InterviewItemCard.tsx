"use client"

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
    Briefcase, 
    Copy, 
    Send, 
    Mail, 
    MessageCircle, 
    Slack 
} from 'lucide-react'
import React from 'react'
import { toast } from 'sonner'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface InterviewItemCardProps {
    interview: {
        id: string;
        jobPosition: string | null;
        experienceLevel: string | null;
        createdAt: Date;
        duration?: string | null;
    }
}

const InterviewItemCard = ({ interview }: InterviewItemCardProps) => {
    
    // Construct the URL for sharing
    // Ensure NEXT_PUBLIC_HOST_URL in .env does NOT have a trailing slash or /interview path
    const shareUrl = `${process.env.NEXT_PUBLIC_HOST_URL}/${interview.id}`;

    const onCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
    }

    const onShareWhatsApp = () => {
        const text = `Check out this mock interview for ${interview.jobPosition}: ${shareUrl}`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    }

    const onShareEmail = () => {
        const subject = `Interview Link: ${interview.jobPosition}`;
        const body = `Here is the mock interview link for ${interview.jobPosition}: ${shareUrl}`;
        const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(url, '_blank');
    }

    const onShareSlack = () => {
        // Slack doesn't have a direct web share URL, so we copy to clipboard
        navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied! You can now paste it in Slack.");
    }

    return (
        <Card className='p-3 rounded-xl shadow-sm border-gray-100 bg-white'>
            {/* Top Section: Icon & Date */}
            <div className='flex justify-between items-start mb-2'>
                <div className='h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center'>
                    <Briefcase className='h-5 w-5 text-white' />
                </div>
                <span className='text-xs text-gray-500 font-medium'>
                    {new Date(interview.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    })}
                </span>
            </div>

            {/* Middle Section: Title & Duration */}
            <div className='mb-3'>
                <h3 className='font-semibold text-lg text-gray-900'>
                    {interview.jobPosition || "Untitled Position"}
                </h3>
                <p className='text-sm text-gray-500 font-medium mt-1'>
                    {interview.duration ? `${interview.duration}` : "15 Min"}
                </p>
            </div>

            {/* Bottom Section: Action Buttons */}
            <div className='flex gap-3 mt-auto'>
                <Button 
                    variant="outline" 
                    className='flex-1 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-black h-10'
                    onClick={onCopyLink}
                >
                    <Copy className='h-4 w-4 mr-2' />
                    Copy Link
                </Button>
                
                {/* Share Menu Popover */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button className='flex-1 bg-blue-600 hover:bg-blue-700 text-white h-10'>
                            <Send className='h-4 w-4 mr-2' />
                            Send
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="end">
                        <div className="flex flex-col gap-1">
                            <Button 
                                variant="ghost" 
                                className="justify-start h-8 text-sm font-normal"
                                onClick={onShareWhatsApp}
                            >
                                <MessageCircle className="h-4 w-4 mr-2 text-green-500" />
                                WhatsApp
                            </Button>
                            
                            <Button 
                                variant="ghost" 
                                className="justify-start h-8 text-sm font-normal"
                                onClick={onShareEmail}
                            >
                                <Mail className="h-4 w-4 mr-2 text-blue-500" />
                                Email
                            </Button>
                            
                            <Button 
                                variant="ghost" 
                                className="justify-start h-8 text-sm font-normal"
                                onClick={onShareSlack}
                            >
                                <Slack className="h-4 w-4 mr-2 text-purple-500" />
                                Slack (Copy)
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </Card>
    )
}

export default InterviewItemCard