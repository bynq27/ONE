# 把 dist/index.html 转成在线发布用的页面（去掉 doctype/html/head/body 外壳，发布时由平台补上）
import re, sys
src = open('dist/index.html', encoding='utf-8').read()
s = re.sub(r'<!doctype html>', '', src, flags=re.I)
s = re.sub(r'</?html[^>]*>|</?head>|</?body>', '', s)
s = re.sub(r'<meta name="viewport"[^>]*>', '', s)
s = s.strip()
open(sys.argv[1], 'w', encoding='utf-8').write(s)
print(len(s))
