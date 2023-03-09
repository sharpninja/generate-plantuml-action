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
    return files.reduce((accum, f) => {
        const p = path.parse(f);
        if (umlFileExtensions.indexOf(p.ext) !== -1) {
            const acc = accum.concat({
                name: p.name,
                // TODO: files may have been deleted.
                code: fs.readFileSync(f).toString(),
                dir: p.dir
            });
            console.log(acc);
            return acc;
        }
        if (markdownExtensions.indexOf(p.ext) !== -1) {
            // TODO: files may have been deleted.
            const content = fs.readFileSync(f).toString();
            const dir = path.dirname(f);
            const codes = puFromMd(content);
            codes.forEach(code => {
                code.dir = path.dirname(f)
                return code;
            })
            const acc = accum.concat(codes);
            console.log(acc);
            return acc;
        }
        console.log(accum);
        return accum;
    }, []);
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

    const res = await Promise.all(commits.map(commit => octokit.repos.getCommit({
        owner, repo, ref: commit.id
    })));
    const results = res.map(res => (<any>res).data);

    console.log(results);

    return results;
}

export function updatedFiles(commits) {
    const files = uniq(commits.reduce(
        (accum: any[], commit) => accum.concat(
            commit.files.filter(f => f.status !== 'removed').map(f => f.filename)
        ),
        []
    ));

    console.log(files);

    return files;
}
