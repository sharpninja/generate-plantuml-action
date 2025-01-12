// TODO logging. YES
import * as core from '@actions/core';
import * as github from '@actions/github';
const axios = require('axios');
import { Base64 } from 'js-base64';
const path = require('path');
const plantumlEncoder = require('plantuml-encoder');

import { retrieveCodes, getFileList } from './utils';

async function generateSvg(code) {
    const encoded = plantumlEncoder.encode(code);
    try {
        const res = await axios.get(`http://www.plantuml.com/plantuml/svg/${encoded}`);
        return res.data;
    } catch(e) {
        // TODO
        console.error(e);
    }
}

const diagramPath = core.getInput('path');
const commitMessage = core.getInput('message');

if (!process.env.GITHUB_TOKEN) {
    core.setFailed('Please set GITHUB_TOKEN env var.');
    process.exit(1);
}
const octokit = new github.GitHub(process.env.GITHUB_TOKEN);

(async function main() {
    //try {
        const payload = github.context.payload;
        const ref = payload.ref;
        if (!payload.repository) {
            throw new Error();
        }
        const owner = payload.repository.owner.login;
        const repo = payload.repository.name;

        //const commits = await getCommitsFromPayload(octokit, payload);
        const files = await getFileList('./docs');  //updatedFiles(commits);
        console.log(`files: ${files}`);

        const plantumlCodes = retrieveCodes(files);
        console.log(`plantumlCodes: ${plantumlCodes}`);

        let tree: any[] = [];
        let plantumlCode: any;
        for (plantumlCode of plantumlCodes) {
            console.log('plantumlCode', plantumlCode)
            let filename = plantumlCode.name.split('\\').pop().split('/').pop();
            filename = filename.substring(0,filename.lastIndexOf('.'));
            console.log('filename', filename)
            const p = path.format({
                dir: diagramPath,
                name: filename,
                ext: '.svg'
            });

            const svg = await generateSvg(plantumlCode.code);
            const blobRes = await octokit.git.createBlob({
                owner, repo,
                content: Base64.encode(svg),
                encoding: 'base64',
            });

            const sha = await octokit.repos.getContents({
                owner, repo, ref, path: p
            }).then(res => (<any>res.data).sha).catch(e => undefined);

            if (blobRes.data.sha !== sha) {
                tree = tree.concat({
                    path: p.toString(),
                    mode: "100644",
                    type: "blob",
                    sha: blobRes.data.sha
                });
            }
        }

        if (tree.length === 0) {
            console.log(`There are no files to be generated.`);
            return;
        }

        // const treeRes = await octokit.git.createTree({
        //     owner, repo, tree,
        //     base_tree: commits[commits.length - 1].commit.tree.sha,
        // });

        // const createdCommitRes = await octokit.git.createCommit({
        //     owner, repo,
        //     message: commitMessage,
        //     parents: [commits[commits.length - 1].sha],
        //     tree: treeRes.data.sha,
        // });

        // const updatedRefRes = await octokit.git.updateRef({
        //     owner, repo,
        //     ref: ref.replace(/^refs\//, ''),
        //     sha: createdCommitRes.data.sha,
        // });

        console.log(`${tree.map(t => t.path).join("\n")}\nAbove files are generated.`);
    // }
    // catch (e) {
    //     throw e;
    // }
})().catch(e => {
    console.error(e.stack);
    core.setFailed(e);
});
