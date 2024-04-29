'use client'
import React, {useState, useEffect} from 'react';
import GPTOutput from "./GPTOutput"

export default function GPTIO({gitCommits})
{
    const [gptInput, setGptInput] = useState("");
    const [gptOutput, setGptOutput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        let gptInputText = "";
    
        if(gitCommits)
        {
            let gptInputTextStart = "Act as a technical writer. Generate a paragraph that outlines the new changes for the current version of the software. ";
            gptInputTextStart += "Make it easy to understand. The target audience is the client of the application. ";
            gptInputTextStart += "Gather the required information from the following git commit titles and descriptions. ";
            
            let atLeastOneJIRADescriptionFound = false;

            const jsonObj = JSON.parse(gitCommits);
            let gptInputTextBody = "";

            jsonObj.commits.forEach(element => {
                gptInputTextBody += "title: " + element.title + "\n"; 

                if(element.jiraDescription)
                {
                    atLeastOneJIRADescriptionFound = true;
                    gptInputTextBody += "JIRA: " + element.jiraDescription + "\n";
                }

                gptInputTextBody += "description: " + element.description + "\n\n"; 
            });

            if(atLeastOneJIRADescriptionFound)
            {
                gptInputTextStart += "Some git commit might will have a JIRA description that give you a hint of what has been done in the commit."
            }

            gptInputTextStart += "\n\n";
            gptInputText = gptInputTextStart + gptInputTextBody;
        }
    
        setGptInput(gptInputText);
    }, [gitCommits]); 

    function SendToGPT(event)
    {
        event.preventDefault();
        if(gptInput === "" || isGenerating)
            return; 

        setGptOutput("");
        
        fetch('/api/gptoutput/', {
            method: 'post',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                gptInput : gptInput
            })
         });

         setIsGenerating(true);
    }

    return (
        <div>
            <form className='gptIO'>
                <p>
                    Here is your GPT input (you can adjust it if needed):
                    <br/>
                    <textarea value={gptInput} name='gptInput' onChange={(event)=>{setGptInput(event.target.value);}} readOnly={!gitCommits}></textarea>
                    <button onClick={SendToGPT}>Send to GPT</button>
                </p>
                <br/>
                <GPTOutput gptOutput={gptOutput} setGptOutput={setGptOutput} isGenerating={isGenerating} setIsGenerating={setIsGenerating}/>
            </form>
        </div>
        
    );
}
