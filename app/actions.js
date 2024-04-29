"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exec } from "child_process";
import path from 'path';
import os from 'os';


 function ValidateDates(startDate, endDate) 
 {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end > start) 
    return true;
    else 
    return false;
}

function ExecuteCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      });
    });
  }

  async function GetJIRAJSon(gitCommitsString, jiraInfo) 
  {
    let gitCommits = JSON.parse(gitCommitsString)


    const regex = /([A-Za-z0-9]{4,7}-\d{1,4})/;
    
    const parts = jiraInfo.split(";");
    const baseURL = parts[0];
    const username = parts[1]; 
    const password = parts[2]; 

    for(let i = 0 ; i < gitCommits.commits.length ; i++)
    {
      const title = gitCommits.commits[i].title;
      const result = title.match(regex);

      if(result == null) // The JIRA ticket could not be found in the commit title
        continue;

      const jiraIssue = result[0];
      const url = `${baseURL}/rest/api/2/issue/${jiraIssue}`;  
      const credentials = Buffer.from(`${username}:${password}`, 'utf-8').toString('base64');

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
      };

      const response = await fetch(url, { headers });

      if (!response.ok) { // an error occured
          continue;
      }

      const jiraJsonString = await response.text();
      const jiraJson = JSON.parse(jiraJsonString);
      const jiraDescription = jiraJson.fields.description;
      gitCommits.commits[i].jiraDescription = jiraDescription;
    }

    return JSON.stringify(gitCommits);
  }

export async function createCommitList(
    prevState,
    formData,
  ) {
    const schema = z.object({
        startDate: z.string().min(1),
        endDate: z.string().min(1),
        project: z.string().min(1)
    });
    const parse = schema.safeParse({
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        project: formData.get("project"),
    });
  
    if (!parse.success || !ValidateDates(parse.data.startDate, parse.data.endDate)) 
    {
      return { message: "Make sure the dates ranges are valid !" };
    }
  
    const data = parse.data;

    // change directory to the GitHub repository
    const platform = os.platform();
    let commandSeperator = ";";
    if (platform === 'win32') {
      commandSeperator = "&&";
    }

    const githubProjectPath = process.env.GENAI_README_GIT_PROJECT_DIRECTORY;
    const projectPath = path.join(githubProjectPath, data.project)
    let cmd = 'cd "' + projectPath + '" ' + commandSeperator + " ";

    // get information about the Git commits
    // #DBQ# will be replace by double quotes later when reating the JSON
    const prettyFormatOutput = '{#DBQ#id#DBQ#: #DBQ#%h#DBQ#, #DBQ#title#DBQ# : #DBQ#%s#DBQ#, #DBQ#description#DBQ# : #DBQ#%b#DBQ#},';
    cmd += 'git log --pretty=format:"' + prettyFormatOutput + '" --since="' + data.startDate + '" --until="' + data.endDate + '"'
    let commandOutput = await ExecuteCommand(cmd);

    // replace all double quotes found in description or commit titles
    commandOutput = commandOutput.replace(/"/g, "'");
    commandOutput = commandOutput.replace(/\n|\t|\r|\*/g, '');
    commandOutput = commandOutput.substring(0, commandOutput.length - 1); // remove last comma from the pretty output

    // Prepare JSON string
    commandOutput = commandOutput.replace(/#DBQ#/g, '"');
    let jsonStr = '{"commits":  [' + commandOutput + ']}'

    if((formData.get("includeJiraCheckbox") != null) && (process.env.GENAI_README_JIRA_INFO != undefined))
    {
      console.log("Fetching JIRA...");
      jsonStr = await GetJIRAJSon(jsonStr, process.env.GENAI_README_JIRA_INFO);
      console.log("Done!");
    }

    revalidatePath("/");
    return { message: `${jsonStr}` };
  }