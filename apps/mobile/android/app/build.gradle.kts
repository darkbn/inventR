import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
}

/**
 * Configuration de signature.
 *
 * Les secrets vivent dans `android/key.properties`, exclu du dépôt. En son
 * absence — poste de développement d'un collègue, CI sans secret — la
 * compilation retombe sur la clé de debug plutôt que d'échouer : on obtient un
 * APK installable, simplement non signé pour la production.
 */
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
val hasReleaseKey = keystorePropertiesFile.exists()
if (hasReleaseKey) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace = "com.kepler.inventair"
    compileSdk = 36
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.kepler.inventair"
        // 24 = Android 7.0. Couvre les terminaux durcis encore en service en
        // entrepôt, tout en permettant les API modernes de caméra.
        minSdk = 24
        targetSdk = 36
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        resourceConfigurations += listOf("fr", "en")
    }

    signingConfigs {
        if (hasReleaseKey) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (hasReleaseKey) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }

            // Réduction du bytecode et des ressources inutilisées. L'essentiel
            // du poids restant (≈ 71 Mo) tient aux bibliothèques natives : le
            // moteur Flutter et ML Kit, compilés pour trois architectures.
            // Pour un APK deux fois plus léger, compiler avec --split-per-abi
            // et distribuer celui qui correspond au terminal.
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    packaging {
        resources {
            excludes += setOf("META-INF/*.kotlin_module", "META-INF/DEPENDENCIES")
        }
    }
}

flutter {
    source = "../.."
}
