const dlg=document.querySelector('dialog');
const page='<div class="page"><span>Кошелёк</span><strong>Ваши деньги.<br>Ваши решения.</strong></div>';
const status='<div class="status"><b>9:41</b><span>● ▰</span></div>';
const bar=(mark=false)=>'<div class="toolbar"><span class="url">nikolaipogodin-padel.github.io</span><span class="menu-dot '+(mark?'marked':'')+'">⋮</span></div>';
const phone=inner=>'<div class="phone">'+status+inner+'</div>';
const step=(n,title,body,caption)=>'<div><h3>'+n+'. '+title+'</h3>'+phone(body)+'<p class="caption">'+caption+'</p></div>';
const android=[step(1,'Откройте меню',bar(true)+page,'В Chrome нажмите на три точки справа от адреса.'),step(2,'Добавьте на главный экран',bar()+page+'<div class="menu"><div>История</div><div>Скачанные файлы</div><div>Поделиться…</div><div class="marked">Добавить на главный экран</div><div>Настройки</div></div>','Выберите «Добавить на главный экран». В некоторых версиях — «Установить приложение».'),step(3,'Подтвердите установку',bar()+page+'<div class="install-prompt"><strong>Установить приложение</strong>Кошелёк<span class="confirm marked">Установить</span></div>','Нажмите «Установить». Затем открывайте Кошелёк с его значка.')];
const safari='<div class="toolbar"><span class="url">nikolaipogodin-padel.github.io</span></div>';
const iphone=[step(1,'Нажмите «Поделиться»',safari+page+'<div class="bottom"><span>‹</span><span>›</span><span class="share marked">↑□</span><span>▱</span></div>','В Safari откройте меню «Поделиться» — квадрат со стрелкой вверх.'),step(2,'Выберите «На экран Домой»',safari+page+'<div class="sheet"><div>Копировать</div><div>Добавить закладку</div><div class="marked">⊞　На экран «Домой»</div><div>Найти на странице</div></div>','Прокрутите список действий, если нужного пункта не видно.'),step(3,'Нажмите «Добавить»',safari+page+'<div class="install-prompt"><strong>На экран «Домой»</strong>Кошелёк<span class="confirm marked">Добавить</span></div>','Если есть переключатель «Открывать как веб-приложение», включите его и добавьте значок.')];

let selectedSteps=android, currentStep=0;
function renderStep(){
  document.querySelector('#visual-steps').innerHTML=selectedSteps[currentStep];
  document.querySelector('.step-count').textContent=`Шаг ${currentStep+1} из 3`;
  document.querySelector('.previous').disabled=currentStep===0;
  document.querySelector('.next').textContent=currentStep===2?'Готово ✓':'Далее →';
  document.querySelectorAll('[data-step]').forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===currentStep));b.setAttribute('aria-label',`Шаг ${i+1}`);});
}
document.querySelectorAll('[data-guide]').forEach(b=>b.addEventListener('click',()=>{
  const a=b.dataset.guide==='android'; selectedSteps=a?android:iphone; currentStep=0;
  document.querySelector('#guide-title').textContent=a?'Android · Chrome':'iPhone · Safari';
  renderStep(); dlg.showModal(); document.body.classList.add('dialog-open'); dlg.scrollTop=0;
}));
document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{currentStep=Number(b.dataset.step);renderStep();}));
document.querySelector('.previous').addEventListener('click',()=>{if(currentStep>0){currentStep--;renderStep();}});
document.querySelector('.next').addEventListener('click',()=>{if(currentStep===2)dlg.close();else{currentStep++;renderStep();}});
document.querySelector('.close').addEventListener('click',()=>dlg.close());
dlg.addEventListener('close',()=>document.body.classList.remove('dialog-open'));
dlg.addEventListener('click',e=>{if(e.target===dlg){const r=dlg.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dlg.close();}});

const openModal=id=>{document.getElementById(id).showModal();document.body.classList.add('dialog-open');};
document.querySelectorAll('[data-modal]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.modal)));
document.querySelectorAll('.info-dialog').forEach(d=>{d.querySelector('.modal-close').addEventListener('click',()=>d.close());d.addEventListener('close',()=>document.body.classList.remove('dialog-open'));d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
document.querySelector('#feedback-form').addEventListener('submit',async e=>{e.preventDefault();try{await navigator.clipboard.writeText('Кошелёк — обратная связь\n'+document.querySelector('#message').value);document.querySelector('#feedback-status').textContent='Скопировано. Отправьте в ваш чат с Николаем.';}catch{document.querySelector('#feedback-status').textContent='Выделите текст сообщения и скопируйте вручную.';}});
document.querySelector('#copy-url').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.origin+location.pathname);document.querySelector('#copy-status').textContent='Ссылка скопирована.';}catch{document.querySelector('#copy-status').textContent=location.origin+location.pathname;}});
