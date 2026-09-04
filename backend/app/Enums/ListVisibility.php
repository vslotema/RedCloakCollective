<?php

namespace App\Enums;

enum ListVisibility: string
{
    case Public = 'public';
    case Followers = 'followers';
    case Private = 'private';
}
