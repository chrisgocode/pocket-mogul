# PROTOTYPE — throwaway balance sim for "Set progression targets and rebalance the economy".
# Greedy best-payback player; 2 taps/s while active. Markets ignored (stocks don't drive pace).
import sys
B=[("vending",250,14,4,1),("food_cart",1250,72,22,1),("coffee_kiosk",4000,230,70,1),
   ("laundromat",7500,350,100,2),("car_wash",30000,1300,400,2),("bakery",100000,4000,1200,2),
   ("delivery",250000,9500,3500,3),("gym",1e6,30000,10000,3),("hotel",1e7,200000,80000,3),
   ("manuf",5e7,800000,300000,4),("airline",2.5e8,3.6e6,1.4e6,4),("space",7.5e8,1e7,4e6,4)]
P=[("studio",2e4,120,20,0),("house",8e4,450,70,0),("duplex",2.5e5,1300,200,1),("apts",1e6,4800,800,1),
   ("retail",5e6,20000,3000,1),("offices",2e7,70000,12000,1),("skyline",1.5e8,450000,75000,1),("seaside",4e8,1.1e6,2e5,1)]
TIER={1:0,2:5000,3:200000,4:8e6}
def bnet(b,c,q,e,m):
    r=b[2]*(1+.1*c)*(1+.1*q); k=b[3]*(1+.06*c)*(1-.02*e); ms=1+.1*((c+q+e)//15)
    return max(0,r-k)*ms*(1.1 if m else 1)
def pnet(p,R,F,S,X): return max(0,p[2]*(1+.1*R+.05*F)*(1+.25*X)-p[3]*(1-.04*S)*(1+.25*X))
def run(wbase=25, wgrow=1.35, tapmult=1.0, session=None, away=0, taps=2.0, horizon=3600*400):
    cash=0;L=0;owned={};props={};peak=0;t=0;act=0;spb={};spp={};marks={}
    while t<horizon:
        active = session is None or (t % (session+away)) < session
        tap=(1+.5*L)*taps*tapmult if active else 0
        passive=sum(bnet(B[i],*v)/60 for i,v in owned.items())+sum(pnet(P[i],*v)/60 for i,v in props.items())
        if not active:  # jump the away period, capped at 8h
            gap=session+away-(t%(session+away)); cash+=passive*min(gap,8*3600); t+=gap; continue
        nw=cash+sum(spb.values())+sum(P[i][1]+.8*spp[i] for i in props); peak=max(peak,nw)
        for th in (1e4,1e5,1e6,1e7,1e8,1e9):
            if peak>=th and th not in marks: marks[th]=(t,act)
        if peak>=1e9: break
        opts=[]
        if L<100: opts.append((.5*taps*tapmult,wbase*wgrow**L,("w",)))
        for i,b in enumerate(B):
            if peak<TIER[b[4]]: continue
            if i not in owned: opts.append((bnet(b,0,0,0,0)/60,b[1],("b",i)))
            else:
                c,q,e,m=owned[i]
                for j,(w,lv) in enumerate(((.2,c),(.25,q),(.15,e))):
                    if lv<20:
                        nv=list(owned[i]);nv[j]+=1
                        opts.append(((bnet(b,*nv)-bnet(b,*owned[i]))/60,b[1]*w*1.18**lv,("u",i,j)))
                if not m: opts.append(((bnet(b,c,q,e,1)-bnet(b,c,q,e,0))/60,2*b[1],("m",i)))
        for i,p in enumerate(P):
            if i not in props: opts.append((pnet(p,0,0,0,0)/60,p[1],("p",i)))
            else:
                v=props[i]
                for j,(w,cap) in enumerate(((.1,10),(.08,10),(.06,10),(.25,4 if p[4] else 0))):
                    if v[j]<cap:
                        nv=list(v);nv[j]+=1
                        opts.append(((pnet(p,*nv)-pnet(p,*v))/60,p[1]*w*1.25**v[j],("q",i,j)))
        g,c,a=max(opts,key=lambda o:o[0]/o[1])
        if cash>=c:
            cash-=c;k=a[0]
            if k=="w":
                L+=1
                if L==1: marks["wallet1"]=(t,act)
                if L==10: marks["wallet10"]=(t,act)
            elif k=="b":
                owned[a[1]]=[0,0,0,0]; spb[a[1]]=c
                if "biz1" not in marks: marks["biz1"]=(t,act)
            elif k=="u": owned[a[1]][a[2]]+=1; spb[a[1]]+=c
            elif k=="m": owned[a[1]][3]=1
            elif k=="p": props[a[1]]=[0,0,0,0]; spp[a[1]]=0
            elif k=="q": props[a[1]][a[2]]+=1; spp[a[1]]+=c
            continue
        t+=1;act+=1;cash+=tap+passive
    return marks,L
def fmt(s): return f"{s:.0f}s" if s<120 else (f"{s/60:.1f}m" if s<7200 else (f"{s/3600:.1f}h" if s<172800 else f"{s/86400:.1f}d"))
keys=["wallet1","biz1","wallet10",1e5,1e6,1e7,1e8,1e9]
print("variant | "+" | ".join(str(k) for k in keys))
for name,kw in [("current wallet $25 x1.35",dict()),
                ("$100 x1.45",dict(wbase=100,wgrow=1.45)),("$100 x1.5",dict(wbase=100,wgrow=1.5)),("$100 x1.6",dict(wbase=100,wgrow=1.6)),
                ("$100 x1.5 + boost heavy",dict(wbase=100,wgrow=1.5,tapmult=3.3)),
                ("$100 x1.5, 30m sessions/4h away",dict(wbase=100,wgrow=1.5,session=1800,away=4*3600))]:
    m,L=run(**kw)
    cells=[]
    for k in keys:
        if k in m:
            t,a=m[k]; cells.append(fmt(a) if kw.get("session") is None else f"{fmt(a)} play / {fmt(t)} real")
        else: cells.append("-")
    print(name+" | "+" | ".join(cells)+f" | finalL={L}")
