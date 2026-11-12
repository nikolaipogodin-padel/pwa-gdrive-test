# Генератор ВЫМЫШЛЕННЫХ выписок для аудита (формат Swedbank LV CSV и Revolut CSV). Реальных данных нет.
import random, datetime as dt, sys, os
random.seed(15)
H='Klienta konts;Ieraksta tips;Datums;Saņēmējs/Maksātājs;Informācija saņēmējam;Summa;Valūta;Debets/Kredīts;Arhīva kods;Maksājuma veids\r\n'
MAIN='LV80HABA0551000000001'; SAV='LV11HABA0551000000002'
def money(v): return f'{v:.2f}'.replace('.',',')
def q(s): return '"'+s.replace('"','""')+'"'
class St:
    def __init__(s,acct,opening): s.acct=acct; s.open=opening; s.ops=[]; s.n=0
    def add(s,d,cp,info,a,dk,pt='CTX'):
        s.n+=1; s.ops.append((d,cp,info,round(a,2),dk,f'{d.strftime("%Y%m%d")}{s.acct[-2:]}{s.n:05d}',pt))
    def csv(s,d1=None,d2=None,bal=True,cur='EUR'):
        ops=sorted([o for o in s.ops if (d1 is None or o[0]>=d1) and (d2 is None or o[0]<=d2)],key=lambda o:o[0])
        prev=[o for o in s.ops if d1 is not None and o[0]<d1]
        ob=s.open+sum(o[3] if o[4]=='K' else -o[3] for o in prev)
        f=lambda d:d.strftime('%d.%m.%Y')
        d1=d1 or ops[0][0]; d2=d2 or ops[-1][0]
        r=H
        if bal: r+=f'{q(s.acct)};10;{f(d1)};;{q("Sākuma atlikums")};{money(ob)};{cur};K;;\r\n'
        for d,cp,info,a,dk,code,pt in ops: r+=f'{q(s.acct)};20;{f(d)};{q(cp)};{q(info)};{money(a)};{cur};{dk};{code};{pt}\r\n'
        tD=sum(o[3] for o in ops if o[4]=='D'); tK=sum(o[3] for o in ops if o[4]=='K')
        r+=f'{q(s.acct)};82;{f(d2)};;{q("Apgrozījums")};{money(tD)};{cur};D;;\r\n{q(s.acct)};82;{f(d2)};;{q("Apgrozījums")};{money(tK)};{cur};K;;\r\n'
        if bal: r+=f'{q(s.acct)};86;{f(d2)};;{q("Beigu atlikums")};{money(ob+tK-tD)};{cur};K;;\r\n'
        return r,len(ops),ob,ob+tK-tD
def card(cp,d,a,city='RIGA'): return f'PIRKUMS 4321********1234 {d.strftime("%d.%m.%Y")} {a:.2f} EUR (5{random.randint(10000,99999)}) {cp} {city} LV'
main=St(MAIN,412.37); sav=St(SAV,1500.00)
groc=['RIMI LATVIA','MAXIMA LATVIJA','LIDL LATVIJA','MEGO']; cafe=['LIDO','CAFFEINE LV','VAIRAK SAULES']; fuel=['CIRCLE K','NESTE LATVIJA']
start=dt.date(2026,5,1); end=dt.date(2026,11,10)
d=start
while d<=end:
    m=d.month
    if d.day==10: main.add(d,'ZIEMELU MAIZE SIA','Darba alga par iepriekšējo mēnesi',1850.00,'K','INWARD CLEARING PAYMENT')
    if d.day==12: main.add(d,'RIGAS NAMU PARVALDNIEKS SIA',f'Rēķins Nr. {m}26-00{random.randint(100,999)} apsaimniekošana',118.40+(60 if m in (10,11) else 0)+random.random()*10,'D','MK')
    if d.day==14: main.add(d,'LATVENERGO AS','Elektrum rēķins līgums 100200300',48+random.random()*20,'D','MK')
    if d.day==15: main.add(d,'TET SIA','Internets un TV, klients 5550001',27.99,'D','MK'); main.add(d,'LATVIJAS MOBILAIS TELEFONS SIA','LMT rēķins 29000000',17.50,'D','MK')
    if d.day==16:
        main.add(d,'SWEDBANK AS','Aizdevuma pamatsummas atmaksa līgums 26-000111',210.00,'D','LOAN'); main.add(d,'SWEDBANK AS','Aizdevuma procentu samaksa līgums 26-000111',41.15,'D','LOAN')
    if d.day==11:
        main.add(d,'JANIS PARAUGS','Uz krājkontu',150.00,'D','MK'); sav.add(d,'JANIS PARAUGS','Uz krājkontu',150.00,'K','MK')
    if d.day==1: main.add(d,'SWEDBANK AS','Kartes mēneša maksa',1.40,'D','COM')
    if d.day==20 and m in (6,9): main.add(d,'ATM RIGA BRIVIBAS 100',f'Skaidras naudas izmaksa 4321********1234 {d.strftime("%d.%m.%Y")} 100.00 EUR ATM',100.00,'D','CTX')
    if d.day==22 and m==7: main.add(d,'ZALANDO SE',card('ZALANDO',d,89.99,'BERLIN'),89.99,'D')
    if d.day==29 and m==7: main.add(d,'ZALANDO SE','Atmaksa par pasūtījumu 10500012345',39.99,'K','INWARD CLEARING PAYMENT')
    if d.day==5 and m in (5,8,10): main.add(d,'ANNA PARAUGA','par pusdienām',15.00,'K','INWARD CLEARING PAYMENT')
    if d.day==25 and m==8: main.add(d,'ERGO INSURANCE SE','OCTA polise 123456789',96.00,'D','MK')
    if d.day==3 and m==9: main.add(d,'BOOKING.COM',card('BOOKING.COM',d,240.00,'AMSTERDAM'),240.00,'D')
    if d.day==18 and m==10: main.add(d,'SIA NEZINAMS VEIKALS',card('NEZINAMS VEIKALS 77',d,64.20),64.20,'D')
    if d.day==27 and m==10: main.add(d,'VALSTS IENEMUMU DIENESTS','Pārmaksātā IIN atmaksa',132.00,'K','INWARD CLEARING PAYMENT')
    if d.weekday() in (1,3,5): 
        cp=random.choice(groc); a=round(8+random.random()*45,2); main.add(d,cp,card(cp,d,a),a,'D')
    if d.weekday()==4:
        cp=random.choice(cafe); a=round(6+random.random()*30,2); main.add(d,cp,card(cp,d,a),a,'D')
    if d.day in (7,21):
        cp=random.choice(fuel); a=round(35+random.random()*30,2); main.add(d,cp,card(cp,d,a),a,'D')
    if d.day==9: a=round(5+random.random()*20,2); main.add(d,'BENU APTIEKA',card('BENU APTIEKA 12',d,a),a,'D')
    d+=dt.timedelta(days=1)
def w(name,txt,enc='utf-8'): open(name,'w',encoding=enc,newline='').write(txt)
D=dt.date
t,n,ob,cb=main.csv(D(2026,5,1),D(2026,10,31)); w('sw_main_2026-05_2026-10.csv',t); print('main 05-10',n,ob,round(cb,2))
t,n,ob,cb=main.csv(D(2026,10,15),D(2026,11,10)); w('sw_main_2026-10-15_2026-11-10.csv',t); print('main overlap',n,round(ob,2),round(cb,2))
t,n,ob,cb=main.csv(D(2026,11,1),D(2026,11,10)); w('sw_main_2026-11.csv',t); print('main nov',n,round(ob,2),round(cb,2))
t,n,ob,cb=main.csv(D(2026,9,1),D(2026,10,31)); w('sw_main_2026-09_2026-10.csv',t); print('main 09-10',n,round(ob,2),round(cb,2))
t,n,ob,cb=sav.csv(D(2026,5,1),D(2026,10,31)); w('sw_sav_2026-05_2026-10.csv',t); print('sav',n,ob,cb)
# край: пропуск месяца (май–июнь, затем сентябрь)
t,n,ob,cb=main.csv(D(2026,5,1),D(2026,6,30)); w('sw_main_2026-05_06.csv',t)
# пограничные файлы
good,_,_,_=main.csv(D(2026,10,1),D(2026,10,31))
w('e_bom.csv','﻿'+good)
w('e_cp1257.csv',good,'cp1257')
w('e_lf.csv',good.replace('\r\n','\n'))
w('e_nobal.csv',main.csv(D(2026,10,1),D(2026,10,31),bal=False)[0])
w('e_truncated.csv',good[:len(good)//2])
w('e_header_only.csv',H)
w('e_empty.csv','')
w('e_garbage.csv','a,b\n1,2\n')
w('e_wrongbal.csv',good.replace(good.split('\r\n')[-2].split(';')[5],'9999,99'))
w('e_comma_delim.csv',good.replace(';',','))
w('e_usd.csv',main.csv(D(2026,10,1),D(2026,10,31),cur='USD')[0])
open('e_fake.pdf.csv','wb').write(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<<>>\nendobj\n'+os.urandom(2000))
# XSS: вредные строки в получателе, назначении
x=St('LV55HABA0551000000009',100.0)
x.add(D(2026,10,2),'<img src=x onerror="window.__xss=1">','<svg onload=window.__xss=2> PIRKUMS',10.00,'D')
x.add(D(2026,10,3),'"><script>window.__xss=3</script>',"' onmouseover='window.__xss=4",11.00,'D')
x.add(D(2026,10,3),'=HYPERLINK("http://evil","x")','{{7*7}} ${7*7} javascript:alert(1)',12.00,'D')
x.add(D(2026,10,4),'A'*400,'Ļoti garš maksājuma mērķis '*30,13.00,'D')
x.add(D(2026,10,5),'NULLE SIA','Nulles summa',0.00,'D')
x.add(D(2026,10,6),'LIELA SUMMA SIA','Liela summa',1234567.89,'K')
w('e_xss.csv',x.csv()[0])
# большой файл: 5 лет, ~20 000 операций
big=St('LV22HABA0551000000003',1000.0); d=D(2021,11,1)
while d<=D(2026,10,31):
    for i in range(11):
        cp=random.choice(groc+cafe+fuel+['BENU APTIEKA','BOLT','WOLT','DROGAS','DEPO DIY','IKEA','APOTHEKA','NARVESEN']); a=round(2+random.random()*60,2); big.add(d,cp,card(cp,d,a),a,'D')
    if d.day==10: big.add(d,'ZIEMELU MAIZE SIA','Darba alga',11500.00,'K','INWARD CLEARING PAYMENT')
    d+=dt.timedelta(days=1)
t,n,ob,cb=big.csv(); w('e_big_5y.csv',t); print('big',n,len(t)//1024,'KB')
# Revolut CSV
rv='Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance\r\n'; b=50.0
rows=[('TOPUP','2026-10-02 09:00:00','Top-Up by *1234',200.00),('CARD_PAYMENT','2026-10-03 12:10:00','Bolt',-7.40),('CARD_PAYMENT','2026-10-05 19:30:00','Wolt',-18.90),('TRANSFER','2026-10-07 10:00:00','To ANNA PARAUGA',-25.00),('CARD_PAYMENT','2026-10-09 08:00:00','Spotify',-9.99),('EXCHANGE','2026-10-10 08:00:00','Exchanged to USD',-50.00),('CARD_REFUND','2026-10-12 08:00:00','Wolt',18.90),('CARD_PAYMENT','2026-10-15 13:00:00','Ryanair',-74.50)]
for t_,s,dsc,a in rows:
    b+=a; rv+=f'{t_},Current,{s},{s},{dsc},{a:.2f},0.00,EUR,COMPLETED,{b:.2f}\r\n'
w('revolut_2026-10.csv',rv)
print(os.listdir('.'))
