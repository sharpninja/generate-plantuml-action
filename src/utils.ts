import fs from 'fs';
import { uniq } from 'lodash';
import path from 'path';
const markdownit = require('markdown-it');
const umlFileExtensions = [
    '.pu',
    '.pml',
    '.puml',
    '.plantuml',
];
const markdownExtensions = [
    '.md',
    '.markdown',
    '.mdown',
    '.mkdn',
    '.mdwn',
    '.mkd',
    '.mdn',
    '.md.txt',
];

export function retrieveCodes(files) {
    let accum: any[] = [];
    for(let i=0; i < files.count; i++)
    {
        const f = files[i];
        const ext = f.split('.').pop();
        if (umlFileExtensions.indexOf(ext) !== -1) {
            const acc = {
                name: f,
                // TODO: files may have been deleted.
                code: fs.readFileSync(f).toString(),
                dir:  path.dirname(f)
            };
            console.log(acc);
            accum.push(acc);
            // return acc;
        }
        if (markdownExtensions.indexOf(ext) !== -1) {
            // TODO: files may have been deleted.
            const content = fs.readFileSync(f).toString();
            const dir = path.dirname(f);
            const codes = puFromMd(content);
            codes.forEach(code => {
                code.dir = path.dirname(f)
                return code;
            })
            console.log(codes);
            accum.push(codes);
            // return acc;
        }
    }
        console.log(accum);
        return accum;

}

const infoRegexp = /^plantuml(?:@(.+))?:([\w-_.]+)/;

function puFromMd(markdown) {
    const md = new markdownit();
    const fences = md.parse(markdown, {})
        .filter(token => token.type === 'fence')
        .filter(token => infoRegexp.test(token.info));

    const reduced = fences.reduce((accum, fence) => {
        const [, umlType, name] = fence.info.match(infoRegexp) || [];
        const [, typeInContent] = fence.content.match(/^(@start\w+)/) || [];

        if (!name) {
            return accum;
        }
        if (typeInContent) {
            const acc = accum.concat({
                name,
                code: fence.content
            })
            console.log(acc);
            return acc;
        }
        const t = umlType || 'uml';
        const results = accum.concat({
            name,
            code: [
                `@start${t}`,
                fence.content.trim(),
                `@end${t}`,
                ''
            ].join("\n"),
        })
        console.log(results);
        return results;
    }, []);

    console.log(reduced);
    return reduced;
}

export async function getCommitsFromPayload(octokit, payload) {
    const commits = payload.commits;
    const owner   = payload.repository.owner.login;
    const repo    = payload.repository.name;

    if(commits && owner && repo){
        const lambda = commit => {
            try{
                const cmt = octokit.repos.getCommit({
                    owner, repo, ref: commit.id
                });
                return cmt;
            }
            catch(e) {
                console.error(e);
                console.error(e.stack);
            }
        }

        const res = await Promise.all(commits.map(lambda));
        const results = res.map(res => (<any>res).data);

        console.log(results);

        return results;
    }
    else{
        console.log("payload", payload);
        console.log("commits",commits);
        console.log("owner",owner);
        console.log("repo",repo);

        return [];
    }
}

// export function updatedFiles(commits) {
//     const files = uniq(commits.reduce(
//         (accum: any[], commit) => accum.concat(
//             commit.files.filter(f => f.status !== 'removed').map(f => f.filename)
//         ),
//         []
//     ));

//     console.log(files);

//     return files;
// }

const { readdir, readfile } = require('fs').promises;

export const getFileList = async (dirName) => {
    let files = await readdir(dirName);

    if(files.count > 0){
        // files = files.forEach(file => {
        //     file.code = readfile(file);
        // });

        return files;
    }
    else{
        throw new Error(`files returned no files from ${dirName}`);
    }
};
