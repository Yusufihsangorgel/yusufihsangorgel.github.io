---
layout: post
title: "Flutter’da SliverAppBar"
date: 2023-01-09 01:07:51 +0300
tags: ["sliverappbar", "flutter-sliver", "flutter", "flutter-türkçe", "slivers"]
medium_url: "https://medium.com/@developeryusufihsan/flutterda-sliverappbar-18db833c63d2"
canonical_url: "https://medium.com/@developeryusufihsan/flutterda-sliverappbar-18db833c63d2"
description: "Herkese selamlar , bugün sizlerle birlikte Flutter’da SliverAppBar class’ını kullanarak basit bir örnek yapacağız."
---

<p><em>Also published on <a href="https://medium.com/@developeryusufihsan/flutterda-sliverappbar-18db833c63d2">Medium</a>.</em></p>

<p>Herkese selamlar , bugün sizlerle birlikte Flutter’da SliverAppBar class’ını kullanarak basit bir örnek yapacağız.</p>

<p>Öncelikle nedir bu SliverAppBar ?</p>

<p>SliverAppBar Flutter’da bir uygulama başlığının nasıl görüneceğini belirleyen bir widget’tır. Bu widget, uygulama başlığının kaydırılırken değişen bir görünümü olabileceğini ve bu değişimin animasyonlar ile desteklenebileceğini sağlar.</p>

<p>“SliverAppBar”, “CustomScrollView” widget’ı içinde kullanılır ve genellikle bir “AppBar” widget’ının bir türevi olarak düşünülür. Bu widget, aşağı kaydırılırken gizlenip, yukarı kaydırılırken ortaya çıkan bir uygulama başlığı yaratır.</p>

<p>Gerçek hayattan bir örneğimizi tanıyalım :</p>

<figure><img alt="" src="https://cdn-images-1.medium.com/max/1024/1*3NGMivLlARjtX9H1jApggw.png" /></figure>

<p>Gördüğünüz gibi scroll edildikten sonra getiryemek logosu,Konum kısmı sabit bir şekilde kalıyor , Konum kısmının altındaki reklam banner’ı kaybolurken Canın ne çekiyor kısmı onun yerini alarak scroll esnasında sabit kalmaya devam ediyor.</p>

<p>Haydi gelin bu örneğimizi Flutter’da yapalım.</p>

<p>Bu örnekte amacımız sadece SliverAppBar olduğu için örneğin bu konuyla alakalı olan kısımlarını kodlayacağız :</p>

<pre>import &#39;package:flutter/material.dart&#39;;<br><br>class SliverAppBarExample extends StatelessWidget {<br>  const SliverAppBarExample({Key? key}) : super(key: key);<br><br>  @override<br>  Widget build(BuildContext context) {<br>    return Scaffold(<br>      body: CustomScrollView(<br>        slivers: [],<br>      ),<br>    );<br>  }<br>}</pre>

<p>SliverAppBarExample adlı StatelessWidget class’ımızı oluşturduk.</p>

<p>Gördüğünüz gibi Scaffold’un body parametresine CustomScrollView verdik , bu widget bize Slivers kullanmamıza olanak sağladı , şimdi gelin örneğimize göre içini dolduralım.</p>

<p>İlk olarak AppBar’ımızı oluşturuyoruz , buradan sonra yazdığımız her kod slivers kısmının içerisinde olacaktır .</p>

<p>AppBar’ımız GetirYemek logosunu ve altındaki Teslimat adresi kısmını kapsayacaktır :</p>

<pre>SliverAppBar(<br>            pinned: true,<br>            expandedHeight: 100,    <br>            elevation:  0,<br>            backgroundColor:  Colors.purple,<br>            bottom:  PreferredSize(<br>              preferredSize:  const Size.fromHeight(50),<br>              child:  Container(<br>                height:  50,<br>                width:  double.infinity,<br>                color:  Colors.white,<br>                child:  const Center(<br>                  child:  Text(<br>                    &#39;Teslimat Adresi Belirleyin Widget&#39;, <br>                    style:  TextStyle(<br>                      color:  Colors.black,<br>                      fontSize:  20,<br>                      fontWeight:  FontWeight.bold,<br>                    ),<br>                  ),<br>                ),<br>              ),<br>            ),<br>            flexibleSpace:  const FlexibleSpaceBar(<br>              title:  SizedBox(<br>                height: 120,<br>                child: Center(child: Text(&#39;Getir Yemek Logo&#39;, style:  TextStyle(color:  Colors.white, fontSize: 25)))),<br>            ),<br>          ),</pre>

<p>Evet AppBar’ımızı oluşturduk ;</p>

<p>pinned:true özelliği sayesinde aşağı scroll edilince kaybolmamasını sağladık .</p>

<p>ExpandedHeight propert’si ise flexibleSpace kısmının scroll en üst kısımdayken ulaşabileceği max height’i belirlemek için kullanılıyor, Örneğimiz de flexibleSpace kısmı her scroll pozisyonunda sabit olduğu için bu değeri 100 girdik çünkü kullanmadığımız 2 property mevcut :</p>

<p>ToolbarHeight ve CollapsedHeight , Collopsed height aşağı scroll durumunda dönüşecek minimum height’i belirliyor . En düşük ToolbarHeight değeri kadar küçülebiliyor , dilerseniz bu property’leri de kendi örneğinizde girip animasyonu daha da canlandırabilirsiniz. Default değerleri 100 girili olduğu için expandedHeight’e bu değeri verdim.</p>

<p>Bottom kısmı ise her koşulda sabit kalıyor.</p>

<p>Evet şuanda GetirYemek Logosu ve altındaki Teslimat adresi kısmını bitirdik.</p>

<p>Şimdi gelelim hemen altındaki scroll edilince kaybolan reklam bannerları kısmına :</p>

<pre> SliverToBoxAdapter(<br>            child: SizedBox(<br>              height: 200,<br>              child: ListView.builder(<br>                scrollDirection: Axis.horizontal,<br>                itemCount: 10,<br>                itemBuilder: (context, index) =&gt; Container(<br>                  width: 200,<br>                  child: const Padding(<br>                    padding: EdgeInsets.all(8.0),<br>                    child: Image(<br>                     //random food image<br>                      image: NetworkImage(&#39;https://picsum.photos/250?image=9&#39;),<br>                      fit: BoxFit.cover,<br>                    ),<br>                  ),<br>                ),<br>              ),<br>            ),<br>          ),</pre>

<p>Evet bu kısımda SliverToBoxAdapter widgetını kullanarak , slivers içerisinde normal bir widget kullanımını sağladık, içerisinde ise basit bir horizontal listview builder bulunmakta. Bu kısım scroll edilince kaybolacak.</p>

<p>Sırada scroll edilince kaybolmayan Canın ne istiyor? kısmı var.</p>

<p>Bu kısmıda SliverAppBar kullanıp pinned:true vererek çözebilirdik ama size Sliver’ların gene pinned:true özelliği olan bir kullanımını daha göstermek istiyorum :</p>

<pre>SliverPersistentHeader (<br>            pinned: true,<br>            delegate:  MyHeaderDelegate(),<br>          ),</pre>

<p>Evet SliverPersistentHeader kullandık , kullanımı SliverAppBar ile neredeyse birebir , bunu göstermemin sebebi ise farklı bir çözüm göstermek sizlere.</p>

<p>Pinned:true vererek scroll edilince kaybolmamasını sağladık , şimdi gelelim delegate kısmına verdiğimiz Class’ımıza :</p>

<pre>class MyHeaderDelegate extends SliverPersistentHeaderDelegate {<br>  @override<br>  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {<br>    return Container(<br>      color: Colors.purple,<br>      height: 50,<br>      child: const Center(child: Text(&#39;Canın ne istiyor? widgetı&#39;, style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold), textAlign: TextAlign.center,)),<br>    );<br>  }<br><br>  @override<br>  double get maxExtent =&gt; 50;<br><br>  @override<br>  double get minExtent =&gt; 50;<br><br>  @override<br>  bool shouldRebuild(SliverPersistentHeaderDelegate oldDelegate) {<br>    return false;<br>  }<br>}</pre>

<p>Bu classımızı SliverPersistentHeaderDelegate classından türettik çünkü delegate property’si bu classı alıyor.</p>

<p>Size SliverAppBar’a çok benzediğini söylemiştim , sadece biraz farklılıkları var.</p>

<p>maxExtent scroll yukarıdayken alabileceği max height’i , minExtent ise scroll aşağı durumdayken alabileceği minimum height’i göstermekte.</p>

<p>Lakin döndürmüş olduğumuz Container height’i 50 ona dikkat edin eğer değerleri değiştireceksiniz , container height’i de güncellenmeli.</p>

<p>shouldRebuild ve diğer parametrelerine bu örnekte girmiyoruz ama kısaca bilgi isterseniz ekran yenilendiğinde çalışmasını istediğiniz şeyler için örneğin refresh indicator kullanımı vs.</p>

<p>Son olarak da aşağıdaki kısım için bir SliverList kullanıyoruz :</p>

<pre>  SliverList(<br>            delegate: SliverChildBuilderDelegate( <br>              (context, index) =&gt; Container(<br>                height: 200,<br>                child: const Padding(<br>                  padding: EdgeInsets.all(8.0),<br>                  child: Image(<br>                    image: NetworkImage(&#39;https://picsum.photos/250?image=9&#39;),<br>                    fit: BoxFit.cover,<br>                  ),<br>                ),<br>              ),<br>              childCount: 10,<br>            ),<br>          ),</pre>

<p>SliverList aynı ListViewBuilder’a benziyor sadece Slivers içerisinde direk kullanım diyebiliriz , tabi kendine özgü propertyleri mevcut.</p>

<p>Örneğimizin Sonu :</p>

<figure><img alt="" src="https://cdn-images-1.medium.com/max/1024/1*5vrhMrb1sDY9qnEVEeCBnw.jpeg" /></figure>

<p>Gördüğünüz gibi scroll edildikten sonra pinned:true özelliği olanlar kaybolmadı.</p>

<p>Tabi Sliverlar ile birlikte ekran tasarlarken sadece bu özellikten değil bir çok özellikten yararlanabiliriz , bunlardan en güzeli ise bence animasyonlar olacaktır.</p>

<p>Sağlıcakla kalın</p>

<p>Kaynak kod :</p>

<p><a href="https://github.com/Yusufihsangorgel/getir_yemek_sliver_app_bar">GitHub - Yusufihsangorgel/getir_yemek_sliver_app_bar: Flutter Slivers Example</a></p>
