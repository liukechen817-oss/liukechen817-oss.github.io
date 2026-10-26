const toast=document.querySelector('.toast');
let toastTimer;
function notify(message){toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2500);}
const search=document.querySelector('#tool-search');
if(search){
 const cards=[...document.querySelectorAll('[data-search]')];
 const filter=()=>{const value=search.value.trim().toLowerCase();let count=0;for(const card of cards){card.hidden=!card.dataset.search.toLowerCase().includes(value);if(!card.hidden)count++;}document.querySelector('.empty-result').hidden=count>0;document.querySelector('.search-status').textContent=value?`找到 ${count} 件工具`:'';};
 search.addEventListener('input',filter);
}
const tabs=[...document.querySelectorAll('[role="tab"]')];
function activateTab(tab,update=true){
 for(const item of tabs){const selected=item===tab;item.setAttribute('aria-selected',String(selected));item.tabIndex=selected?0:-1;const panel=document.getElementById(item.getAttribute('aria-controls'));panel.hidden=!selected;if(!selected)panel.querySelectorAll('video').forEach(v=>v.pause());}
 if(update)history.replaceState(null,'','#'+tab.getAttribute('aria-controls'));
}
if(tabs.length){
 activateTab(tabs.find(t=>'#'+t.getAttribute('aria-controls')===location.hash)||tabs[0],false);
 for(const tab of tabs){tab.addEventListener('click',()=>activateTab(tab));tab.addEventListener('keydown',event=>{let i=tabs.indexOf(tab);if(event.key==='ArrowRight')i=(i+1)%tabs.length;else if(event.key==='ArrowLeft')i=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')i=0;else if(event.key==='End')i=tabs.length-1;else return;event.preventDefault();activateTab(tabs[i]);tabs[i].focus();});}
 window.addEventListener('hashchange',()=>{const tab=tabs.find(t=>'#'+t.getAttribute('aria-controls')===location.hash);if(tab)activateTab(tab,false);});
}
const dialog=document.querySelector('.lightbox');
let previousFocus;
for(const button of document.querySelectorAll('[data-image]'))button.addEventListener('click',()=>{previousFocus=button;dialog.querySelector('img').src=button.dataset.image;dialog.querySelector('img').alt=button.dataset.caption;dialog.querySelector('p').textContent=button.dataset.caption;dialog.showModal();document.body.classList.add('modal-open');});
function closeImage(){dialog.close();}
dialog.querySelector('button').addEventListener('click',closeImage);
dialog.addEventListener('click',event=>{if(event.target===dialog)closeImage();});
dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');previousFocus?.focus();});
document.querySelector('[data-copy]')?.addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(location.href);notify('档案链接已复制');}
 catch{notify('可从浏览器地址栏复制这份档案的链接');}
});
