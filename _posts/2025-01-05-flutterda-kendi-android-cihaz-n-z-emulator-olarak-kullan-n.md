---
layout: post
title: "Flutter’da Kendi Android Cihazınızı Emülatör Olarak Kullanın"
date: 2025-01-05 18:40:00 +0300
tags: ["mobile-development", "flutter", "programming", "android-development", "software-development"]
medium_url: "https://medium.com/@developeryusufihsan/flutterda-kendi-android-cihaz%C4%B1n%C4%B1z%C4%B1-em%C3%BClat%C3%B6r-olarak-kullan%C4%B1n-64e2150a4d06"
canonical_url: "https://medium.com/@developeryusufihsan/flutterda-kendi-android-cihaz%C4%B1n%C4%B1z%C4%B1-em%C3%BClat%C3%B6r-olarak-kullan%C4%B1n-64e2150a4d06"
description: "Flutter geliştirme sürecinde Android Studio’nun standart emülatörü yerine kendi Android cihazınızı kullanmak geliştirme sürecini ciddi anlamda hızlandırabilir. Bu yazıda, scrcpy aracını kullanarak Android cihazınızı nasıl etkili bir geliştirme ortamına dönüştürebileceğinizi anlatacağım."
---

<p><em>Also published on <a href="https://medium.com/@developeryusufihsan/flutterda-kendi-android-cihaz%C4%B1n%C4%B1z%C4%B1-em%C3%BClat%C3%B6r-olarak-kullan%C4%B1n-64e2150a4d06">Medium</a>.</em></p>

<figure><img alt="" src="https://cdn-images-1.medium.com/max/1024/1*T8V7i5UClAPAevrspGbJDw.png" /></figure>

<p>Flutter geliştirme sürecinde Android Studio’nun standart emülatörü yerine kendi Android cihazınızı kullanmak geliştirme sürecini ciddi anlamda hızlandırabilir. Bu yazıda, scrcpy aracını kullanarak Android cihazınızı nasıl etkili bir geliştirme ortamına dönüştürebileceğinizi anlatacağım.</p>

<h3>Neden Fiziksel Cihaz?</h3>

<p>Emülatör kullanırken karşılaşılan yaygın sorunlar:</p>

<ul><li>Bilgisayarın fazla ısınması</li><li>RAM kullanımının çok yüksek olması</li><li>Geç açılması ve yavaş çalışması</li></ul><p>Bu sorunları aşmak için kendi Android telefonunuzu test cihazı olarak kullanabilirsiniz. Hem daha az sistem kaynağı tüketir, hem de gerçek cihaz deneyimi sunar.</p>

<h3>Gereksinimler</h3>

<p>Başlamadan önce ihtiyacımız olanlar:</p>

<ul><li>VSCode</li><li>Flutter SDK</li><li>Android SDK</li><li>Bir Android telefon</li><li>USB kablo</li><li>scrcpy aracı</li></ul><h3>Adım Adım Kurulum</h3>

<h3>1. Android Telefonun Hazırlanması</h3>

<ol><li>Telefonunuzun ayarlarına girin</li><li>“Telefon hakkında” kısmını bulun</li><li>“Yapı numarası”na 7 kez tıklayın</li><li>Geliştirici seçenekleri aktif olacak</li><li>Geliştirici seçeneklerinde “USB hata ayıklama”yı açın</li><li>Telefonunuzu bilgisayara bağladığınızda ekranda “USB hata ayıklamaya izin verilsin mi?” şeklinde bir pencere çıkacak</li><li>Bu pencerede “Bu bilgisayar için her zaman izin ver” seçeneğini işaretleyin</li><li>“İzin ver” butonuna tıklayın</li></ol><h3>2. scrcpy Kurulumu</h3>

<p>İşletim sisteminize göre kurulum yapabilirsiniz:</p>

<p>Windows için:</p>

<pre># Chocolatey ile kurulum<br>choco install scrcpy<br><br># Scoop ile kurulum<br>scoop install scrcpy</pre>

<p>macOS için:</p>

<pre>brew install scrcpy</pre>

<p>Linux için:</p>

<pre># Ubuntu/Debian<br>sudo apt install scrcpy<br><br># Arch Linux<br>sudo pacman -S scrcpy</pre>

<h3>3. Bağlantı ve Kullanım</h3>

<p>VSCode’da terminal açıp (Ctrl/Cmd + `) şu komutları çalıştırın:</p>

<pre># Telefon bağlantısını kontrol edin<br>adb devices<br><br># scrcpy&#39;yi başlatın<br>scrcpy --window-title &#39;Test Cihazı&#39;</pre>

<h3>Kullanışlı Parametreler</h3>

<p>En kullanışlı scrcpy parametreleri:</p>

<pre># Pil tasarrufu için<br>scrcpy --turn-screen-off<br><br># Performans için<br>scrcpy --max-size 1024 --bit-rate 2M<br><br># Ekran kaydı için<br>scrcpy --record kayit.mp4</pre>

<h3>Yaşadığım Sorunlar ve Çözümleri</h3>

<h3>Telefon Görünmüyorsa</h3>

<p>En sık karşılaşılan sorunlar için çözümler:</p>

<ul><li>USB kabloyu çıkarıp tekrar takın</li><li>Farklı USB portu deneyin</li><li>adb’yi yeniden başlatın:</li></ul><pre>adb kill-server<br>adb start-server</pre>

<h3>İşletim Sistemine Özel Çözümler</h3>

<p><strong>Windows için:</strong></p>

<ul><li>Sürücülerin güncel olduğundan emin olun</li><li>Windows güvenlik duvarı izinlerini kontrol edin</li></ul><p><strong>macOS için:</strong></p>

<ul><li>USB kabloyu direkt MacBook’a takın (USB hub kullanmayın)</li><li>Android File Transfer uygulamasını kapatın</li></ul><p><strong>Linux için:</strong></p>

<ul><li>udev kurallarını kontrol edin</li><li>adb kullanıcı izinlerini düzenleyin</li></ul><h3>Performans İyileştirmeleri</h3>

<p>Daha iyi performans için öneriler:</p>

<ol><li>Ekran çözünürlüğünü düşürün:</li></ol><pre>scrcpy --max-size 1024</pre>

<p>2. Bit hızını ayarlayın:</p>

<pre>scrcpy --bit-rate 2M</pre>

<p>3. FPS limitini ayarlayın:</p>

<pre>scrcpy --max-fps 60</pre>

<h3>Flutter Projesini Çalıştırma</h3>

<p>VSCode’da yeni bir terminal açın ve:</p>

<pre>flutter run</pre>

<p>Flutter otomatik olarak bağlı cihazı algılayacak ve uygulamayı yükleyecektir.</p>

<h3>Sonuç</h3>

<p>Bu yöntemi kullanarak:</p>

<ul><li>Bilgisayarınız daha az yorulur</li><li>Geliştirme süreci hızlanır</li><li>Gerçek cihazda test yapabilirsiniz</li><li>Sistem kaynakları daha verimli kullanılır</li></ul><p><em>Bu yazıyı faydalı bulduysanız alkışlamayı ve paylaşmayı unutmayın. Farklı işletim sistemlerinde karşılaştığınız sorunları veya kendi çözümlerinizi yorumlarda paylaşabilirsiniz. Okuduğunuz için teşekkürler :)</em></p>
