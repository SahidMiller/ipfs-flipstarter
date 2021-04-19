// Load the marked library to parse markdown text,
const unified = require("unified")
const markdown = require('remark-parse')
const remark2rehype = require('remark-rehype')
const htmlInMarkdown = require('rehype-raw')
const githubMarkdown = require('remark-gfm')
const html = require('rehype-stringify')

// Print out the campaign texts.
const processor = unified()
    .use(githubMarkdown)
    .use(markdown)
    .use(remark2rehype, {allowDangerousHtml: true})
    .use(htmlInMarkdown)
    .use(html)

module.exports = async (content) => {
    const result = await processor.process(content)
    return result.contents || ""
}