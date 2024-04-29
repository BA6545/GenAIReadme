'use client'
import React, {useState, useEffect} from 'react';

export default function GPTOutput({gptOutput, setGptOutput, isGenerating, setIsGenerating})
{

    useEffect(() => {
        let intervalId;

        if(isGenerating)
        {
            intervalId = setInterval(async () => {
                if (isGenerating) 
                {
                    const res = await fetch('/api/gptoutput/');
                    const data = await res.json();
                     
                    setGptOutput(data.gptOutput);
                    setIsGenerating(data.isGenerating)
                } 
                else 
                {
                    clearInterval(intervalId);
                }
            }, 250);
        }
 
        return () => {
            if(intervalId)
                clearInterval(intervalId);
        }
    }, [isGenerating]);

    return (
        <p>
            Here is your GPT output:
            <br/>
            <textarea value={gptOutput} readOnly></textarea>
        </p>
    );
}
