---
layout: post
title: "Flutter'da BuildContext Extension'ları ile MediaQuery Tekrarından Kurtulmak"
date: 2026-07-10 21:15:00 +0300
tags: [flutter, dart, türkçe]
---

![MediaQuery tekrarından extension'a](/assets/images/context-extensions.png)

Merhaba arkadaşlar, uzun bir aradan sonra tekrar Türkçe bir yazı yazmak istedim. Son dönemde daha çok İngilizce blog tarafındaydım ama Flutter tarafında ufak ama hayat kurtaran bir konuya değinmeden edemedim. Konu şu: `MediaQuery.sizeOf(context)`'i her build metodunda tekrar tekrar yazmaktan sıkılmak. Belki basit gelecek ama responsive bir arayüz yapıyorsanız gün içinde bu satırı kaç kere yazdığınızı bir sayın :)

## Önce dert nereden çıktı

Geçenlerde kendi portfolyo sitemi (Flutter web) elden geçiriyordum. Ekranda ne var ne yok neredeyse hepsi ekran genişliğine göre şekil değiştiriyor; mobilde tek kolon, tablette iki, masaüstünde üç falan. Doğal olarak her yerde ekran genişliğini okuyorum. Kod da böyle bir hal almıştı:

```dart
static bool isMobile(BuildContext context) =>
    MediaQuery.sizeOf(context).width < mobileWidth;

static bool isDesktop(BuildContext context) {
  final width = MediaQuery.sizeOf(context).width;
  return width >= tabletWidth && width < desktopWidth;
}
```

Tek başına baktığınızda gayet masum duruyor. Ama bu `MediaQuery.sizeOf(context).width` ifadesi projede onlarca yere serpiştirilmiş durumda. Her section, her widget, her yerde aynı çağrı. Yani okurken göz yoruyor, üstüne bir de her seferinde `.width` mi lazımdı `.size.width` mi diye bir an durup düşünüyorsunuz. (Eskiden `MediaQuery.of(context).size.width` yazardık, `sizeOf` yeni ve daha performanslı olduğu için ona geçtim ama o ayrı bir yazının konusu.)

Bu tür tekrarları gördüğümde aklıma hep Dart'ın en sevdiğim özelliklerinden biri geliyor: **extension**.

## Kendi extension'ını yazmak

Extension'ın güzelliği şu; var olan bir tipe, o tipin kaynak koduna hiç dokunmadan yeni metodlar/getter'lar ekleyebiliyorsunuz. `BuildContext` de bunun için birebir. Şöyle küçük bir dosya açıyoruz:

```dart
import 'package:flutter/widgets.dart';

extension ContextSizeX on BuildContext {
  double get screenWidth => MediaQuery.sizeOf(this).width;
  double get screenHeight => MediaQuery.sizeOf(this).height;

  // ekran genişliğinin belli bir oranını almak için
  double dynamicWidth(double val) => screenWidth * val;
}
```

Bu kadar. Artık `MediaQuery.sizeOf(context).width` yazacağıma:

```dart
final width = context.screenWidth;
final half = context.dynamicWidth(0.5); // ekranın yarısı
```

diyorum ve bitiyor. Okunabilirlik bir anda değişiyor. `context.screenWidth` cümlenin ortasında bile gözü rahatsız etmiyor, ne yaptığı belli. `dynamicWidth(0.5)` gibi bir şey ise özellikle "şu kutu ekranın yarısı kadar olsun" derdine çok yakışıyor, sabit piksel yerine oranla düşünmeye alıştırıyor sizi.

Burada dikkat: extension aslında altta yine aynı `MediaQuery.sizeOf`'u çağırıyor. Yani sihir yok, sadece tekrar eden kısmı tek yere topladık. Ama işin güzel yanı da bu zaten — davranış aynı kalıyor, sadece yazımı temizliyoruz.

Şöyle bir soru gelebilir: "Bunu static bir yardımcı sınıfa da koyabilirdin, `ResponsiveUtils.width(context)` gibi, farkı ne?" Haklı bir soru, ben de aslında projemde hem bir `ResponsiveUtils` sınıfı hem de bu extension'ları bir arada kullanıyorum. Benim gördüğüm fark şu: `isMobile`, `isDesktop` gibi bir grup mantığı bir arada tutmak, breakpoint'leri tek yerden yönetmek istediğimde static sınıf daha derli toplu duruyor. Ama sadece "şu context'in genişliğini ver" gibi tek satırlık, cümlenin akışına girecek şeyler için `context.screenWidth` demek `ResponsiveUtils.width(context)` demekten çok daha akıcı. Yani ikisi rakip değil, ben ikisini de yerine göre kullanıyorum.

## Her projede baştan yazmak istemiyorsanız: hazır paketler

Bu extension'ları her yeni projede sıfırdan yazmak bir süre sonra angarya olabiliyor. Neyse ki hazır çözümler var. Ben portfolyo projemde Türk Flutter camiasından tanıdığımız VB10'un `kartal` paketini kullanıyorum; orada `context.sized.width`, `context.sized.height` gibi hazır getter'lar geliyor. Yukarıda kendi yazdığım `dynamicWidth`'in aynısı da var:

```dart
final screenWidth = context.sized.width;

// mesela contact bölümünde ekranın %60'ı kadar minimum yükseklik istedim:
Container(
  constraints: BoxConstraints(
    minHeight: context.sized.dynamicHeight(0.6),
  ),
  // ...
);
```

kartal dışında da benzer işi yapan paketler var (responsive tarafına özel olanlar da mevcut), tercih size kalmış. Benim yaklaşımım şu oldu: küçük ve tek amaçlı bir şey için illa paket eklemem, kendi iki satırlık extension'ımı yazarım; ama zaten projede başka nedenlerle o paket varsa hazır geleni kullanırım, tekerleği yeniden icat etmenin anlamı yok.

## Dürüst olalım — bu her derde deva değil

Bir kaç noktada gerçekçi olmakta fayda var, çünkü bu tarz "temizlik" yazılarında genelde sadece güzel tarafı anlatılıyor.

Birincisi, extension size'ı `context`'ten okuyor. Yani hâlâ elinizde bir `BuildContext` olmak zorunda. `build` metodunun dışında, mesela bir controller'ın içinde ekran genişliğine ihtiyacınız varsa bu yaklaşım tek başına yetmiyor.

İkincisi ve bence en sinsi olanı: `MediaQuery.sizeOf`'u okuyan widget, ekran boyutu her değiştiğinde (klavye açılınca, pencere yeniden boyutlanınca) tekrar build oluyor. Extension bunu değiştirmiyor, sadece gizliyor. Çağrı görünmez olunca "acaba burası gereksiz mi rebuild oluyor" sorusunu sormayı unutabiliyorsunuz. Ben de bir iki yerde bunu geç fark ettim.

Üçüncüsü, itiraf edeyim: kendi projemde geçiş henüz yarım. Bazı section'larda `context.sized.width` kullanıyorum, bazı eski dosyalarda hâlâ düz `MediaQuery.sizeOf(context).width` duruyor. İkisi bir arada olunca da aslında ortaya bir tutarsızlık çıkıyor ki bu extension'ın çözmeye çalıştığı derdin ta kendisi. Yani araç iyi ama disiplin sizde :) Fırsat buldukça hepsini tek stile çekmeye çalışıyorum.

## Toparlarsak

Extension'lar Flutter'da gerçekten küçük ama tatmin edici bir kalite artışı sağlıyor. `context.screenWidth` gibi iki satırlık bir şey bile kodun okunabilirliğini hissedilir derecede değiştiriyor. İster kendiniz yazın, ister `kartal` gibi hazır bir paketten alın — mühim olan aynı `MediaQuery` çağrısını yirmi yere kopyalamayı bırakmak.

Kod tarafını merak ederseniz portfolyo projem GitHub'da açık, responsive kısımlarına ve `context.sized` kullanımına oradan bakabilirsiniz. Aklınıza takılan olursa ya da "ben şöyle yapıyorum" diyeceğiniz bir yöntem varsa yorumlarda buluşalım, bu tür ufak pratikleri konuşmayı seviyorum.

Okuduğunuz için teşekkürler, sağlıcakla kalın :)
