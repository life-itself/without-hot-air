import os
import sys
import shutil
from distutils.dir_util import copy_tree

TMPDIR = './tmp'
EPUB = 'without-hot-air.epub'
# Chapters live at the repo root: the root is the Flowershow publish root.
SRC = '.'
MARKDOWN = os.path.join(TMPDIR, 'markdown')
IMAGES = './assets'

def retrieve():
    # Main epub version linked on https://www.withouthotair.com/epubVersions.html
    cmd = 'curl http://www.inference.eng.cam.ac.uk/sustainable/book/translate/SustainableEnergy-withoutthehotair-DavidJCMacKay.epub > without-hot-air.epub'
    os.system(cmd)

def prepare():
    if os.path.exists(TMPDIR):
        shutil.rmtree(TMPDIR)
    os.makedirs(TMPDIR)
    os.makedirs(MARKDOWN)

    if not os.path.exists(SRC):
        os.makedirs(SRC)

    if not os.path.exists(IMAGES):
        os.makedirs(IMAGES)

def extract():
    # unzip then pandoc xhtml to markdown

    cmd = 'unzip -q %s -d %s' % (EPUB, TMPDIR)
    os.system(cmd)

    htmldir = os.path.join(TMPDIR, 'OEBPS', 'Text')
    files = [ f for f in os.listdir(htmldir) if f.endswith('xhtml') ]
    for f in files:
        mdfn = f.split('.')[0] + '.md'
        infp = os.path.join(htmldir, f)
        md = os.path.join(MARKDOWN, mdfn)
        cmd = 'pandoc %s -t gfm -o %s --wrap=none' % (infp, md)
        os.system(cmd)

def etl():
    '''
    1. make tmp
    2. E: unzip epub
    3. T: 1. pandoc to markdown from xhtml 2. process each chapter
    4. L: copy output to right location
    5. cleanup

    Layout:

    /tmp/
        /markdown/

    unzip results in text files in ...

        OEBPS/Text

    e.g.

        ./tmp/OEBPS/Text/chap01.xhtml
        ./tmp/OEBPS/Text/chap02.xhtml
        ./tmp/OEBPS/Text/chap03.xhtml
    '''
    prepare()
    extract()

    # now clean up each file
    files = [ f for f in os.listdir(MARKDOWN) ]
    for fn in files:
        md = os.path.join(MARKDOWN, fn)
        dest = os.path.join(SRC, fn)
        try:
            content = open(md, encoding='utf8').read() 
            out = transform(content)
        except:
            print(md)
            raise
        open(dest, 'w', encoding='utf8').write(out)

    # sort images
    # (was copy_tree(..., 'IMAGES') - a literal string, so this used to write into
    #  a directory named IMAGES rather than the configured one)
    copy_tree(os.path.join(TMPDIR, 'OEBPS', 'Images'), IMAGES)



import re
def transform(file_string):
    # clean up the markdown
    out = file_string

    # replace non-breaking spaces ...
    out = out.replace(u'\xa0', u' ')

    # find and replace patterns
    regexes = [
        # TODO: does this even exist in xhtml conversion? (this was done for epub)
        # remove stuff like <span id="titlepage.xhtml"></span>
        # <span class="figurenumber">Figure 1.2.</span> Are "our" fossil fuels running out? Total crude oil production from the North Sea, and oil price in 2006 dollars per barrel. [<span class="darkred">\[10\]</span>](#chap01.xhtml#ch01n10)
        # ['^<span.*><\/span>$', ''],

        # Fix # 1   Motivations
        ['   ', ' '],

        # convert quotes
        # <div class="quote"> ...
        [r'<div class="quote">\n\n(.*)\n\n<\/div>', r'> \g<1>'],
        # without a proper parser a bit hacky to handle when multiple lines
        [r'<div class="quote"[^>]*>\n\n(.*)\n\n((.*))?\n\n<\/div>', r'> \g<1>\n>\n> \g<2>'],

        # fix image links
        [r'\.\./Images/', '/assets/'],

        # correct quotes to normal quotes
        ['”', '"'],
        ['“', '"'],
        ['”', '"'],

        # strip trailng white space
        [' *$', ''],

        # remove [image] all divs
        # e.g. <div class="imgcap" style="float: right; width: 26%">
        # e.g. <div class="smallfont" style="width: 50%; padding-left: 10%">
        [r'<div[^>]*>', ''],
        [r'</div>', ''],
        # remove multiple blank lines
        [r'\n\n(\n)+', r'\n\n'],

        # footnotes
        # footnote ref
        # e.g. [<span class="darkred">\[5\]</span>](#ch01n05)
        [r'\[<span class="[^>]*>\\\[(\d+)\\\]<\/span>\]\(#ch0?(\d+)n0?(\d+)\)',
            r'[^\g<1>]'],
        
        # footnote itself
        # [<span class="mark">\[22\]</span>](#ret22)
        [r'\[<span class="mark">\\\[(\d+)\\\]</span>\]\(#ret\d+\)', r'[^\g<1>]: '],

        # we generally don't need the pandoc escaping of [
        # e.g. \[energy\]
        [r'\\\[', '['],
        [r'\\\]', ']'],

        # special patches - this is for bibliography file
        #-  <span class="smallcaps"> {OECD</span> Nuclear Energy Agency}. (2006).
        # fix the {...} which breaks rendering of website as thinks it is regex
        [r'{OECD</span> Nuclear Energy Agency}', 'OECD</span> Nuclear Energy Agency'],
        # then fix smallcaps there in general
        # NOT doing for now as useful to have this for author
        # [r'<span class="smallcaps">([^<]*)</span>', r'\g<1>'],
    ]

    for regex in regexes:
        out = re.sub(regex[0], regex[1], out, flags=re.MULTILINE)

    return out


def test_transform():
    instring = '''# 1   Motivations

<div class="quote">

*We live at a time when emotions and feelings count more than truth, and there is a vast ignorance of science.*

James Lovelock

</div>

<div class="quote">

*if everyone does a little, we’ll achieve only a little.*

</div>

<div class="imgcap" style="float: right; width: 26%">

![OutOfGas](../Images/OutOfGasS.jpg)

<div class="caption2">

David Goodstein’s *Out of Gas* (2004).

</div>

![SkepticalEnvironmentalist](../Images/lomborgSES.jpg)

<div class="caption2">

Bjørn Lomborg’s *The Skeptical Environmentalist* (2001).

</div>

![RevengeOfGaia](../Images/revengeOfGaiaS.jpg)

<div class="caption2">

*The Revenge of Gaia: Why the earth is ﬁghting back – and how we can still save humanity.* James Lovelock (2006). © Allen Lane.

</div>

</div>

“Wind or nuclear?”, for example. ... to ﬁll the \[energy\] gap is living in an utter dream world and is, in my view, an enemy of the people.” [<span class="darkred">\[1\]</span>](#ch01n01)<span class="red"> \*</span>

<div class="caption2">

[<span class="mark">\[3\]</span>](#ret03)*quote text here ...*

-  <span class="smallcaps"> {OECD</span> Nuclear Energy Agency}. (2006).
'''

    exp = '''# 1 Motivations

> *We live at a time when emotions and feelings count more than truth, and there is a vast ignorance of science.*
>
> James Lovelock

> *if everyone does a little, we’ll achieve only a little.*

![OutOfGas](/img/without-hot-air/OutOfGasS.jpg)

David Goodstein’s *Out of Gas* (2004).

![SkepticalEnvironmentalist](/img/without-hot-air/lomborgSES.jpg)

Bjørn Lomborg’s *The Skeptical Environmentalist* (2001).

![RevengeOfGaia](/img/without-hot-air/revengeOfGaiaS.jpg)

*The Revenge of Gaia: Why the earth is ﬁghting back – and how we can still save humanity.* James Lovelock (2006). © Allen Lane.

"Wind or nuclear?", for example. ... to ﬁll the [energy] gap is living in an utter dream world and is, in my view, an enemy of the people." [^1]<span class="red"> \*</span>

[^3]: *quote text here ...*

-  <span class="smallcaps"> OECD</span> Nuclear Energy Agency. (2006).
'''

    out = transform(instring)
    print(out)
    assert out == exp


# Page titles
#
# Flowershow takes a page's title from frontmatter, falling back to a level-1
# heading only when it leads the file. Many chapters open with a figure before
# their heading, so without this the site navigation read "chap03", "chap04"...
# The part dividers additionally carry raw HTML in their heading, which rendered
# as visible markup.
#
# Idempotent: safe to re-run over already-titled files.

TITLE_OVERRIDES = {
    'dedication': 'Dedication',
    'titlepage': 'Title page',
}

SKIP_TITLING = ('index.md', 'README.md', 'CLAUDE.md')


def _clean(text):
    """Strip HTML tags and markdown emphasis from a heading."""
    text = re.sub(r'<[^>]*>', '', text)
    text = re.sub(r'[*_]{1,3}(.+?)[*_]{1,3}', r'\g<1>', text)
    return ' '.join(text.split())


def page_title(path, body):
    """Derive a display title for one markdown file."""
    stem = os.path.splitext(os.path.basename(path))[0]
    if stem in TITLE_OVERRIDES:
        return TITLE_OVERRIDES[stem]

    lines = body.split('\n')
    for i, line in enumerate(lines):
        if not line.startswith('# '):
            continue
        title = _clean(line[2:])
        # Part dividers put their subtitle on the next line:
        #   # <span class="smallfont">*Part I*</span>
        #   <span class="lightblue">Numbers, not adjectives</span>
        # Keyed on the smallfont marker rather than the word "part", so a re-run
        # over an already-cleaned heading does not swallow the following line.
        if 'smallfont' in line and i + 1 < len(lines):
            subtitle = _clean(lines[i + 1])
            if subtitle:
                title = '%s: %s' % (title, subtitle)
        return title
    return stem


def clean_part_heading(body, title):
    """Replace a part divider's raw-HTML heading with plain text."""
    lines = body.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('# ') and 'smallfont' in line:
            lines[i:i + 2] = ['# ' + title]
            return '\n'.join(lines)
    return body


def titles(directory=SRC):
    """Write a frontmatter title into every chapter file."""
    for name in sorted(os.listdir(directory)):
        if not name.endswith('.md') or name in SKIP_TITLING:
            continue
        path = os.path.join(directory, name)
        text = open(path, encoding='utf8').read()

        body = text
        if text.startswith('---\n'):
            end = text.find('\n---', 3)
            if end != -1:
                body = text[end + 4:].lstrip('\n')

        title = page_title(path, body)
        body = clean_part_heading(body, title)
        open(path, 'w', encoding='utf8').write(
            '---\ntitle: "%s"\n---\n\n%s' % (title.replace('"', '\\"'), body)
        )
        print('%-20s %s' % (name, title))


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'titles':
        titles()
    else:
        etl()
        titles()

