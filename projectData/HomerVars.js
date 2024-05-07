/**
* javascript variables for the Homer project:
* FEM+PLAY - Mondo Futuro
* Homer - The Story Flow Editor.
* Copyright (c)2021-2024. Open Lab s.r.l - Florence, Italy
* Developer: Pupunzi (Matteo Bicocchi)
*
**/

class HomerVars {

      static world_temperature = 28;

};

class HomerActors {

      static NARRATORE = "Narratore";

}

class HomerMeta {
      static FLOW_STATE = {
          IDEA : 'IDEA',
          NOTES : 'NOTES',
          DRAFT : 'DRAFT',
          EDITOR : 'EDITOR',
          FINAL : 'FINAL',
      };
      static MOOD = {
          NEUTRAL : 'NEUTRAL',
          HAPPY : 'HAPPY',
          VERY_HAPPY : 'VERY_HAPPY',
          SAD : 'SAD',
          ANGRY : 'ANGRY',
          AMAZED : 'AMAZED',
      };
      static EXPRESSION = {
          RELAXED : 'RELAXED',
          GRINNING : 'GRINNING',
          PENSIVE : 'PENSIVE',
          FROWNING : 'FROWNING',
          CRYING : 'CRYING',
          ENRAGED : 'ENRAGED',
      };
      static BALLOON_TYPE = {
          SPEECH : 'SPEECH',
          WHISPER : 'WHISPER',
          THOUGHT : 'THOUGHT',
          SCREAM : 'SCREAM',
          SLEEP : 'SLEEP',
          SING_SONG : 'SING_SONG',
      };
      static LOCATION = {
          HOME : 'HOME',
          OUTSIDE : 'OUTSIDE',
          OFFICE : 'OFFICE',
          PARK : 'PARK',
          SEA : 'SEA',
          MOUNTAIN : 'MOUNTAIN',
      };
      static CAMERA_DIRECTION = {
          CLOSE_UP : 'CLOSE_UP',
          ANGLE_ON : 'ANGLE_ON',
          OFF_SCREEN : 'OFF_SCREEN',
          FADE_OUT : 'FADE_OUT',
          FADE_IN : 'FADE_IN',
          VOICE_OVER : 'VOICE_OVER',
      };
      static LIGHTNING = {
          KEY : 'KEY',
          BACK : 'BACK',
          PRACTICAL : 'PRACTICAL',
          HARD : 'HARD',
          SOFT : 'SOFT',
          CHIAROSCURO : 'CHIAROSCURO',
      };

}

class HomerLabels {


}


class HomerFlowSlugs {
      static START = "Start";
      static LOOP_SCENE = "Loop scene";
 }

