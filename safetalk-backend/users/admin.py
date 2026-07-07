from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.http import HttpResponseRedirect
from django.template.response import TemplateResponse
from django.urls import path, reverse

from .models import User


def approve_psychologist_user(user):
    user.role = User.Role.PSYCHOLOGIST
    user.is_psychologist_verified = True
    user.is_active = True
    user.save(update_fields=["role", "is_psychologist_verified", "is_active"])

    try:
        profile = user.psychologist_profile
    except User.psychologist_profile.RelatedObjectDoesNotExist:
        return False

    if not profile.is_available:
        profile.is_available = True
        profile.save(update_fields=["is_available", "updated_at"])

    return True


class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = (
            "username",
            "email",
            "full_name",
            "role",
            "is_psychologist_verified",
        )


class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = "__all__"


@admin.action(description="Verify selected psychologists")
def verify_selected_psychologists(modeladmin, request, queryset):
    verified_count = 0
    missing_profile_count = 0

    for user in queryset.filter(role=User.Role.PSYCHOLOGIST):
        profile_available = approve_psychologist_user(user)
        verified_count += 1
        if not profile_available:
            missing_profile_count += 1

    modeladmin.message_user(
        request,
        f"{verified_count} psychologist application(s) verified successfully.",
        level=messages.SUCCESS,
    )

    skipped_count = queryset.exclude(role=User.Role.PSYCHOLOGIST).count()
    if skipped_count:
        modeladmin.message_user(
            request,
            f"{skipped_count} selected user(s) skipped because they are not psychologists.",
            level=messages.WARNING,
        )

    if missing_profile_count:
        modeladmin.message_user(
            request,
            (
                f"{missing_profile_count} verified psychologist(s) do not have a "
                "PsychologistProfile, so availability could not be updated."
            ),
            level=messages.WARNING,
        )


@admin.action(description="Reject psychologist applications")
def reject_psychologist_applications(modeladmin, request, queryset):
    updated_count = queryset.update(is_active=False)
    modeladmin.message_user(
        request,
        f"{updated_count} psychologist application(s) rejected and deactivated.",
        level=messages.WARNING,
    )


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = User
    change_list_template = "admin/users/user/change_list.html"
    actions = [verify_selected_psychologists, reject_psychologist_applications]

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "email", "full_name")}),
        (
            "Safetalk",
            {
                "fields": (
                    "role",
                    "is_psychologist_verified",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "email",
                    "full_name",
                    "role",
                    "is_psychologist_verified",
                    "password1",
                    "password2",
                ),
            },
        ),
    )

    list_display = (
        "username",
        "full_name",
        "role",
        "is_psychologist_verified",
        "is_active",
        "date_joined",
    )

    list_filter = (
        "role",
        "is_psychologist_verified",
    )

    search_fields = (
        "username",
        "email",
        "full_name",
    )

    ordering = ("username",)
    filter_horizontal = (
        "groups",
        "user_permissions",
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("psychologist_profile")

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "pending-applications/",
                self.admin_site.admin_view(self.pending_applications_view),
                name="users_user_pending_applications",
            ),
            path(
                "<int:user_id>/approve-application/",
                self.admin_site.admin_view(self.approve_application_view),
                name="users_user_approve_application",
            ),
            path(
                "<int:user_id>/reject-application/",
                self.admin_site.admin_view(self.reject_application_view),
                name="users_user_reject_application",
            ),
        ]
        return custom_urls + urls

    def pending_applications_view(self, request):
        applications = (
            self.get_queryset(request)
            .filter(
                role=User.Role.PSYCHOLOGIST,
                is_psychologist_verified=False,
            )
            .order_by("-date_joined")
        )

        context = {
            **self.admin_site.each_context(request),
            "opts": self.model._meta,
            "title": "Pending Psychologist Applications",
            "applications": applications,
        }
        return TemplateResponse(request, "admin/users/user/pending_applications.html", context)

    def approve_application_view(self, request, user_id):
        user = self.get_object(request, user_id)
        if user is None:
          self.message_user(request, "Psychologist application not found.", level=messages.ERROR)
          return HttpResponseRedirect(reverse("admin:users_user_pending_applications"))

        if user.role != User.Role.PSYCHOLOGIST:
            self.message_user(
                request,
                f"{user.full_name or user.username} is not a psychologist application.",
                level=messages.ERROR,
            )
            return HttpResponseRedirect(reverse("admin:users_user_pending_applications"))

        profile_available = approve_psychologist_user(user)
        if profile_available:
            self.message_user(
                request,
                (
                    f"{user.full_name or user.username} has been verified as a "
                    "psychologist and marked available."
                ),
                level=messages.SUCCESS,
            )
        else:
            self.message_user(
                request,
                (
                    f"{user.full_name or user.username} has been verified, but no "
                    "PsychologistProfile was found to mark available."
                ),
                level=messages.WARNING,
            )
        return HttpResponseRedirect(reverse("admin:users_user_pending_applications"))

    def reject_application_view(self, request, user_id):
        user = self.get_object(request, user_id)
        if user is None:
          self.message_user(request, "Psychologist application not found.", level=messages.ERROR)
          return HttpResponseRedirect(reverse("admin:users_user_pending_applications"))

        user.is_active = False
        user.save(update_fields=["is_active"])
        self.message_user(
            request,
            f"{user.full_name or user.username} has been rejected and deactivated.",
            level=messages.WARNING,
        )
        return HttpResponseRedirect(reverse("admin:users_user_pending_applications"))
