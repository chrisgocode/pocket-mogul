import math
# Rough greedy sim of current spec balance: active play 2 taps/s, no boost, no ads, no markets.
B=[("vending",250,14,4,1),("food_cart",1250,72,22,1),("laundromat",7500,350,100,2),("car_wash",30000,1300,400,2),
   ("delivery",250000,9500,3500,3),("gym",1e6,30000,10000,3),("hotel",1e7,200000,80000,4),("manuf",5e7,800000,300000,4)]
P=[("studio",20000,120,20,0),("house",80000,450,70,0),("duplex",250000,1300,200,1),("apts",1e6,4800,800,1),("retail",5e6,20000,3000,1),("offices",2e7,70000,12000,1)]
TIER={1:0,2:5000,3:200000,4:8e6}
def bnet(b,c,q,e,m):
    r=b[2]*(1+.1*c)*(1+.1*q); k=b[3]*(1+.06*c)*(1-.02*e); ms=1+.1*((c+q+e)//15)
    return max(0,r-k)*ms*(1.1 if m else 1)
def pnet(p,R,F,S,X): return max(0,p[2]*(1+.1*R+.05*F)*(1+.25*X)-p[3]*(1-.04*S)*(1+.25*X))
def run(taps=2.0, horizon=60*60*40):
    cash=0;L=0;owned={};props={};peak=0;t=0;spent_b={};spent_p={}
    marks={};
    while t<horizon:
        tap=(1+.5*L)*taps  # $/s
        inc=tap+sum(bnet(B[i],*v)/60 for i,v in owned.items())+sum(pnet(P[i],*v)/60 for i,v in props.items())
        nw=cash+sum(spent_b.values())+sum(P[i][1]+.8*spent_p[i] for i in props)
        peak=max(peak,nw)
        for th in (1e3,1e4,1e5,1e6,1e7):
            if peak>=th and th not in marks: marks[th]=t
        if peak>=1e7: break
        # options: (gain $/s, cost, action)
        opts=[]
        if L<100: opts.append((.5*taps,25*1.35**L,("w",)))
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
        g,c,a=max(opts,key=lambda o:o[0]/o[1])  # best payback
        if cash>=c:
            cash-=c
            if a[0]=="w": L+=1
            elif a[0]=="b": owned[a[1]]=[0,0,0,0]; spent_b[a[1]]=c
            elif a[0]=="u": owned[a[1]][a[2]]+=1; spent_b[a[1]]+=c
            elif a[0]=="m": owned[a[1]][3]=1
            elif a[0]=="p": props[a[1]]=[0,0,0,0]; spent_p[a[1]]=0
            elif a[0]=="q": props[a[1]][a[2]]+=1; spent_p[a[1]]+=c
            if a[0]=="w" and L==1: marks["wallet1"]=t
            if a[0]=="b" and "biz1" not in marks: marks["biz1"]=t
            continue
        t+=1; cash+=inc
    return marks,L
m,L=run()
for k,v in m.items(): print(k, f"{v/60:.1f} min" if v<7200 else f"{v/3600:.2f} h")
print("wallet level at end",L)
