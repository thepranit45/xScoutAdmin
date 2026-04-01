package com.xscout.app.di

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideFirebaseAuth(): FirebaseAuth = FirebaseAuth.getInstance()

    @Provides
    @Singleton
    fun provideFirebaseFirestore(): FirebaseFirestore = FirebaseFirestore.getInstance()

    @Provides
    @Singleton
    fun provideMoshi(): com.squareup.moshi.Moshi = com.squareup.moshi.Moshi.Builder()
        .add(com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory())
        .build()

    @Provides
    @Singleton
    fun provideXScoutApi(moshi: com.squareup.moshi.Moshi): com.xscout.app.data.api.XScoutApiService {
        val logging = okhttp3.logging.HttpLoggingInterceptor().apply {
            level = okhttp3.logging.HttpLoggingInterceptor.Level.BODY
        }
        val client = okhttp3.OkHttpClient.Builder()
            .addInterceptor(logging)
            .build()

        return retrofit2.Retrofit.Builder()
            .baseUrl("http://10.0.2.2:8000/") // Local dev machine (Emulator bridge)
            .addConverterFactory(retrofit2.converter.moshi.MoshiConverterFactory.create(moshi))
            .client(client)
            .build()
            .create(com.xscout.app.data.api.XScoutApiService::class.java)
    }
}

