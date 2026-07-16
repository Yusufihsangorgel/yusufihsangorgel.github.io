---
layout: post
title: "Flutter’da macOS Dmg Çıktısı Alma"
date: 2023-02-16 14:36:30 +0300
tags: ["flutter-mac", "dmg", "macos", "flutter"]
medium_url: "https://medium.com/@developeryusufihsan/flutterda-macos-dmg-%C3%A7%C4%B1kt%C4%B1s%C4%B1-alma-4bf862ddee19"
canonical_url: "https://medium.com/@developeryusufihsan/flutterda-macos-dmg-%C3%A7%C4%B1kt%C4%B1s%C4%B1-alma-4bf862ddee19"
description: "Merhaba sevgili flutter geliştiriciler ,"
---

<p><em>Also published on <a href="https://medium.com/@developeryusufihsan/flutterda-macos-dmg-%C3%A7%C4%B1kt%C4%B1s%C4%B1-alma-4bf862ddee19">Medium</a>.</em></p>

<p>Merhaba sevgili flutter geliştiriciler ,</p>

<figure><img alt="" src="https://cdn-images-1.medium.com/max/1024/1*mW38TSYvPqFqyM4XhOWUMg.jpeg" /></figure>

<p>Bugün sizlere yazmış olduğunuz Flutter uygulamasının nasıl kolayca dmg çıktısını alacağınızı göstereceğim , hiçbir Appstore-Xcode işlemi de gerekmeyecek .</p>

<p>Öncelikle npm kurmanız gerekmektedir , NodeJS kendi sitesi üzerinden kurabilirsiniz :</p>

<p><a href="https://nodejs.org/en/">Node.js - Run JavaScript Everywhere</a></p>

<p>Npm kurduktan sonra ihtiyacımız olan paketi kuruyoruz :</p>

<pre>npm install -g appdmg</pre>

<p>Paketin linki bu eğer detaylı incelemek isterseniz :</p>

<p><a href="https://www.npmjs.com/package/appdmg">appdmg</a></p>

<p>Paketi kurduktan sonra Flutter projemizin bulunduğu dosyanın içerisine geliyoruz , ve içerisine şu şekilde dosyalarımızı oluşturalım :</p>

<figure><img alt="" src="https://cdn-images-1.medium.com/max/398/1*xy5nwqGLRFaB-5D6Zwf6pg.png" /></figure>

<p>Herhangi bir dosyanın içerisinde olmasına gerek yok sadece flutter proje dosyasının içerisinde olması yeterli kolay bulmak açısından.</p>

<p>Icon’un ismi size kalmış ve dilerseniz bu siteden yapabilirsiniz, ben buradan yapmıştım :</p>

<p><a href="https://cloudconvert.com/">CloudConvert</a></p>

<p>Sonrasında config.json dosyamızı yapılandıralım :</p>

<pre>{<br>    &quot;title&quot;: &quot;Uygulamanızın İsmi&quot;,<br>    &quot;icon&quot;: &quot;./favicon.icns&quot;,<br>    &quot;contents&quot;: [<br>        {<br>            &quot;x&quot;: 448,<br>            &quot;y&quot;: 344,<br>            &quot;type&quot;: &quot;link&quot;,<br>            &quot;path&quot;: &quot;/Applications&quot;<br>        },<br>        {<br>            &quot;x&quot;: 192,<br>            &quot;y&quot;: 344,<br>            &quot;type&quot;: &quot;file&quot;,<br>            &quot;path&quot;: &quot;../../build/macos/Build/Products/Release/uygulamamız.app&quot;<br>        }<br>    ]<br>}</pre>

<p>Bu şekilde yapılandıralım.</p>

<p>Sonrasında terminal’e gelip</p>

<pre>flutter build macos</pre>

<p>Komutunu çalıştıralım ve çıktımızı alalım.</p>

<figure><img alt="" src="https://cdn-images-1.medium.com/max/398/1*-sR-35Gg5G8_ujVPi-Jd0w.png" /></figure>

<p>Uygulamız flutter projemiz içerisinde bu dosya yolunda olacaktır.</p>

<p>Sonrasında terminal’den cd komutunu kullanarak dmg_creator dosyasına kadar girelim.</p>

<p>Sonrasında terminal’e gelip</p>

<pre>appdmg ./config.json ./fluttermacos.dmg </pre>

<p>Komutunu çalıştıralım ve çıktımızı alalım , çıktımız aynı dosya içerisinde oluşacaktır. Fluttermacos.dmg yazmanıza gerek yok isterseniz oraya yusuf.dmg de yazabilirsiniz :D</p>

<p>Sonrasında dmg yi finderdan bularak veya direk bir yere sürükleyerek , sonrasında tıklayarak kurabilirsiniz :</p>

<figure><img alt="" src="https://cdn-images-1.medium.com/max/1024/1*CBvd4M5EfI2v8wdlbegQ3A.png" /></figure>

<p>Kurduktan sonra normal tıklayarak denediğiniz de güvenlik hatası verebilir , böyle yaparsa sağ tıklayarak open demeniz gerekmektedir.</p>

<p>Evet , yazımı okuduğunuz için çok teşekkür ederim .</p>

<p>Bonus olarak da eğer uygulamanızda izin gereken şeyler varsa örneğin en yaygını API Request , örneğin bunun için DebugProfile.entitlements dosyası içerisinde :</p>

<pre> &lt;key&gt;com.apple.security.network.server&lt;/key&gt;<br> &lt;true/&gt;<br> &lt;key&gt;com.apple.security.network.client&lt;/key&gt;<br> &lt;true/&gt;</pre>

<p>yazarak izin almanız gerekmektedir .</p>

<p>Tekrardan teşekkür ederim , hoşçakalın :)</p>
