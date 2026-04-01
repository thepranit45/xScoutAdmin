package com.xscout.app.data.api

import retrofit2.http.*

data class UserResponseDTO(
    val student_id: String,
    val description: String?,
    val is_active: Boolean
)

data class ListUsersResponse(
    val success: Boolean,
    val users: List<UserResponseDTO>
)

data class HeartbeatResponse(
    val success: Boolean,
    val message: String?
)

interface XScoutApiService {
    @GET("auth/api/list-users/")
    suspend fun getAuthorizedStudents(): ListUsersResponse

    @GET("api/telemetry/")
    suspend fun getTelemetryData(): TelemetryResponse

    @POST("auth/api/verify-id/")
    suspend fun verifyId(@Body body: Map<String, String>): HeartbeatResponse
}

data class TelemetryResponse(
    val status: String,
    val data: List<Map<String, Any>>
)

