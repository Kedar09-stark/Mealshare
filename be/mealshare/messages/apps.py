from django.apps import AppConfig


class MessagesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'messages'
    # Use a unique label to avoid collision with django.contrib.messages
    label = 'mealshare_messages'
