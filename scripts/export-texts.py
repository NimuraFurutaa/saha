"""Export user-facing Persian copy, retaining file/line references for replacement."""
from pathlib import Path
from html.parser import HTMLParser
import re
ROOT = Path(__file__).resolve().parent.parent
fa = re.compile('[\u0600-\u06ff]')
class CopyParser(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts=[]; self.skip=0
    def handle_starttag(self,tag,attrs):
        if tag in ('script','style'): self.skip+=1
        for key,value in attrs:
            if key in ('aria-label','placeholder','title','alt','value') and value and fa.search(value): self.parts.append(value)
    def handle_endtag(self,tag):
        if tag in ('script','style'): self.skip=max(0,self.skip-1)
    def handle_data(self,data):
        if not self.skip and (fa.search(data) or 'MADE BY US' in data or 'Lover Is a Day' in data or 'Cuco' in data):
            text=' '.join(data.split())
            if text: self.parts.append(text)
def strings(source):
    i=0
    while i<len(source):
        if source.startswith('//',i):
            end=source.find('\n',i); i=end if end>=0 else len(source);continue
        if source.startswith('/*',i):
            end=source.find('*/',i+2); i=end+2 if end>=0 else len(source);continue
        if source[i] not in "'\"`":i+=1;continue
        quote=source[i]; start=i; i+=1; body=[]
        while i<len(source):
            if source[i]=='\\' and i+1<len(source):body.append(source[i:i+2]);i+=2;continue
            if source[i]==quote:i+=1;break
            body.append(source[i]);i+=1
        yield start,''.join(body)
groups={}
def add(group,text,ref):
    bucket=groups.setdefault(group,{})
    bucket.setdefault(text,[]).append(ref)
source=(ROOT/'index.html').read_text()
# Collect by section, including labels and placeholders used by assistive technology.
section='سربرگ و معرفی'
for number,line in enumerate(source.splitlines(),1):
    for marker,name in [('id="playground"','نقاشی: ابزارها و بوم'),('class="worlds"','باغ و ستاره‌ها'),('class="keepsakes','پاکت‌ها و نامه'),('class="pixel-section','پیشی‌های پیکسلی'),('class="music-gift','آهنگ'),('class="memory-section','مینی‌گیم'),('class="bottom"','پایان صفحه')]:
        if marker in line:section=name
    parser=CopyParser();parser.feed(line)
    for text in parser.parts:add(section,text,f'index.html:{number}')
for filename in ('app.js','extras.js'):
    source=(ROOT/filename).read_text()
    for offset,body in strings(source):
        if not (fa.search(body) or 'MADE BY US' in body):continue
        line=source.count('\n',0,offset)+1
        if filename=='app.js':
            if offset<source.index('// A small, locally remembered garden.'):section='نقاشی: پیام‌ها، ایده‌ها و کارت‌پستال'
            elif offset<source.index('const starPoints'):section='باغ: پیام‌ها'
            elif offset<source.index('const modal ='):section='آسمان: پیام‌ها'
            elif offset<source.index('class RainSoundscape'):section='نامه، قرارها، آرزو و راز ماه'
            else:section='باران: پیام‌ها'
        else:
            section='پیشی‌ها: پیام‌های نوازش' if offset<source.index('const songAudio') else 'آهنگ: پیام‌های پخش' if offset<source.index('const symbols=') else 'مینی‌گیم: کارت‌ها و پیام‌ها'
        parser=CopyParser();parser.feed(body)
        for text in parser.parts:add(section,text,f'{filename}:{line}')
lines=['متن‌های جهان کوچک ما — نسخه قابل ویرایش','', 'راهنما: متن هر شناسه را جایگزین کن و این فایل را برگردان تا تغییرها را روی سایت اعمال کنم.', 'این فایل فهرست متن‌هاست؛ ویرایش آن به‌تنهایی متن داخل سایت را تغییر نمی‌دهد.', 'بخش‌های ${...} جای عدد، نام یا نتیجه‌ی بازی هستند؛ آن‌ها را دست‌نخورده بگذار.', 'متن‌های دسترس‌پذیری (توضیح دکمه برای صفحه‌خوان) هم در این فهرست آمده‌اند.', '']
count=0
for section,items in groups.items():
    lines.extend(['='*55, section, '='*55,''])
    for text,refs in items.items():
        count+=1;lines.extend([f'[T{count:03}] | '+', '.join(dict.fromkeys(refs)),text,''])
(ROOT/'site-texts.txt').write_text('\n'.join(lines),encoding='utf-8')
print(f'Exported {count} text entries to site-texts.txt')
