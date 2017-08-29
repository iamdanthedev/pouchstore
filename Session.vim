let SessionLoad = 1
if &cp | set nocp | endif
let s:so_save = &so | let s:siso_save = &siso | set so=0 siso=0
let v:this_session=expand("<sfile>:p")
silent only
cd ~/Projects/pouchstore
if expand('%') == '' && !&modified && line('$') <= 1 && getline(1) == ''
  let s:wipebuf = bufnr('%')
endif
set shortmess=aoO
badd +0 src/Item.ts
badd +0 src/Store.ts
badd +73 src/StoreOptions.ts
badd +37 src/types.ts
badd +3 package.json
badd +0 .gitignore
argglobal
silent! argdel *
set stal=2
edit src/StoreOptions.ts
set splitbelow splitright
wincmd _ | wincmd |
vsplit
wincmd _ | wincmd |
vsplit
2wincmd h
wincmd w
wincmd _ | wincmd |
split
1wincmd k
wincmd w
wincmd w
set nosplitbelow
set nosplitright
wincmd t
set winheight=1 winwidth=1
exe 'vert 1resize ' . ((&columns * 90 + 135) / 271)
exe '2resize ' . ((&lines * 56 + 34) / 69)
exe 'vert 2resize ' . ((&columns * 110 + 135) / 271)
exe '3resize ' . ((&lines * 10 + 34) / 69)
exe 'vert 3resize ' . ((&columns * 110 + 135) / 271)
exe 'vert 4resize ' . ((&columns * 69 + 135) / 271)
argglobal
setlocal fdm=indent
setlocal fde=0
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=7
setlocal fml=1
setlocal fdn=20
setlocal fen
13
normal! zo
15
normal! zo
let s:l = 9 - ((7 * winheight(0) + 33) / 67)
if s:l < 1 | let s:l = 1 | endif
exe s:l
normal! zt
9
normal! 079|
wincmd w
argglobal
edit src/Store.ts
setlocal fdm=syntax
setlocal fde=0
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=3
setlocal fml=1
setlocal fdn=20
setlocal fen
25
normal! zo
103
normal! zo
130
normal! zo
228
normal! zo
let s:l = 24 - ((23 * winheight(0) + 28) / 56)
if s:l < 1 | let s:l = 1 | endif
exe s:l
normal! zt
24
normal! 072|
wincmd w
argglobal
enew
setlocal fdm=manual
setlocal fde=0
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=3
setlocal fml=1
setlocal fdn=20
setlocal fen
wincmd w
argglobal
edit src/Item.ts
setlocal fdm=syntax
setlocal fde=0
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=3
setlocal fml=1
setlocal fdn=20
setlocal fen
39
normal! zo
307
normal! zo
let s:l = 311 - ((41 * winheight(0) + 33) / 67)
if s:l < 1 | let s:l = 1 | endif
exe s:l
normal! zt
311
normal! 013|
wincmd w
exe 'vert 1resize ' . ((&columns * 90 + 135) / 271)
exe '2resize ' . ((&lines * 56 + 34) / 69)
exe 'vert 2resize ' . ((&columns * 110 + 135) / 271)
exe '3resize ' . ((&lines * 10 + 34) / 69)
exe 'vert 3resize ' . ((&columns * 110 + 135) / 271)
exe 'vert 4resize ' . ((&columns * 69 + 135) / 271)
tabedit .gitignore
set splitbelow splitright
set nosplitbelow
set nosplitright
wincmd t
set winheight=1 winwidth=1
argglobal
setlocal fdm=indent
setlocal fde=0
setlocal fmr={{{,}}}
setlocal fdi=#
setlocal fdl=7
setlocal fml=1
setlocal fdn=20
setlocal fen
let s:l = 7 - ((6 * winheight(0) + 33) / 66)
if s:l < 1 | let s:l = 1 | endif
exe s:l
normal! zt
7
normal! 05|
tabnext 2
set stal=1
if exists('s:wipebuf')
  silent exe 'bwipe ' . s:wipebuf
endif
unlet! s:wipebuf
set winheight=1 winwidth=20 shortmess=filnxtToO
let s:sx = expand("<sfile>:p:r")."x.vim"
if file_readable(s:sx)
  exe "source " . fnameescape(s:sx)
endif
let &so = s:so_save | let &siso = s:siso_save
doautoall SessionLoadPost
unlet SessionLoad
" vim: set ft=vim :
